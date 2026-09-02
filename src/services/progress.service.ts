import { db } from '@/lib/db';
import { EnrollmentService } from './enrollment.service';

export interface VideoCompleteResponse {
  lesson_id: string;
  video_completed: boolean;
  is_completed: boolean;
  best_quiz_score: number | null;
  message: string;
}

export class ProgressService {
  /**
   * Idempotently marks a lesson's video as completed and evaluates dual-trigger lesson completion.
   * Dual-trigger formula: is_completed = (video_completed === true) && (best_quiz_score >= passing_score)
   */
  static async markVideoComplete(
    userId: string,
    lessonId: string,
    telemetry?: { playback_seconds?: number }
  ): Promise<VideoCompleteResponse> {
    // 1. Fetch lesson and related module/course and quiz
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            courseId: true,
          },
        },
        quiz: {
          select: {
            id: true,
            passingScore: true,
          },
        },
      },
    });

    if (!lesson) {
      const error: any = new Error('Lesson tidak ditemukan.');
      error.code = 'LESSON_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // 2. Ensure auto-enrollment for the user in the parent course
    if (lesson.module?.courseId) {
      await EnrollmentService.autoEnroll(userId, lesson.module.courseId);
    }

    // 3. Evaluate Quiz Best Score & Passing State
    let bestQuizScore: number | null = null;
    let isQuizPassed = false;

    if (lesson.quiz) {
      const attempts = await db.quizAttempt.findMany({
        where: {
          userId,
          quizId: lesson.quiz.id,
        },
        select: { score: true },
      });

      if (attempts.length > 0) {
        bestQuizScore = Math.max(...attempts.map((a) => a.score));
        isQuizPassed = bestQuizScore >= lesson.quiz.passingScore;
      }
    }

    // Dual-trigger evaluation (Rule 15 / PRD-02):
    // video_completed is becoming true, so is_completed = true iff quiz is passed
    const isCompleted = isQuizPassed;
    const now = new Date();

    // 4. Check existing progress record for idempotency
    const existingProgress = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
    });

    const progress = await db.lessonProgress.upsert({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        videoCompleted: true,
        videoCompletedAt: now,
        isCompleted: isCompleted,
        completedAt: isCompleted ? now : null,
      },
      update: {
        videoCompleted: true,
        videoCompletedAt: existingProgress?.videoCompletedAt ?? now,
        isCompleted: isCompleted,
        completedAt: isCompleted
          ? existingProgress?.completedAt ?? now
          : null,
        updatedAt: now,
      },
    });

    return {
      lesson_id: lesson.id,
      video_completed: progress.videoCompleted,
      is_completed: progress.isCompleted,
      best_quiz_score: bestQuizScore,
      message: 'Status pemutaran video berhasil disimpan.',
    };
  }

  /**
   * Retrieves user progress for a specific lesson including best quiz score.
   */
  static async getLessonProgress(userId: string, lessonId: string) {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quiz: {
          select: { id: true, passingScore: true },
        },
      },
    });

    if (!lesson) {
      const error: any = new Error('Lesson tidak ditemukan.');
      error.code = 'LESSON_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const progress = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
    });

    let bestQuizScore: number | null = null;
    let totalAttempts = 0;

    if (lesson.quiz) {
      const attempts = await db.quizAttempt.findMany({
        where: {
          userId,
          quizId: lesson.quiz.id,
        },
        select: { score: true },
      });
      totalAttempts = attempts.length;
      if (totalAttempts > 0) {
        bestQuizScore = Math.max(...attempts.map((a) => a.score));
      }
    }

    return {
      lesson_id: lesson.id,
      video_completed: progress?.videoCompleted ?? false,
      video_completed_at: progress?.videoCompletedAt ?? null,
      is_completed: progress?.isCompleted ?? false,
      completed_at: progress?.completedAt ?? null,
      best_quiz_score: bestQuizScore,
      total_quiz_attempts: totalAttempts,
    };
  }

  /**
   * Re-evaluates lesson completion based on dual-trigger condition:
   * is_completed = (video_completed == true) && (best_quiz_score >= 70)
   */
  static async evaluateLessonCompletion(userId: string, lessonId: string) {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quiz: {
          select: { id: true, passingScore: true },
        },
      },
    });

    if (!lesson) {
      const error: any = new Error('Lesson tidak ditemukan.');
      error.code = 'LESSON_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const progress = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
    });

    const isVideoCompleted = progress?.videoCompleted ?? false;
    let isQuizPassed = false;
    let bestQuizScore: number | null = null;

    if (lesson.quiz) {
      const attempts = await db.quizAttempt.findMany({
        where: {
          userId,
          quizId: lesson.quiz.id,
        },
        select: { score: true },
      });
      if (attempts.length > 0) {
        bestQuizScore = Math.max(...attempts.map((a) => a.score));
        isQuizPassed = bestQuizScore >= lesson.quiz.passingScore;
      }
    }

    const isCompleted = isVideoCompleted && isQuizPassed;
    const now = new Date();

    const updatedProgress = await db.lessonProgress.upsert({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        videoCompleted: isVideoCompleted,
        videoCompletedAt: progress?.videoCompletedAt ?? null,
        isCompleted: isCompleted,
        completedAt: isCompleted ? now : null,
      },
      update: {
        isCompleted: isCompleted,
        completedAt: isCompleted
          ? progress?.completedAt ?? now
          : null,
        updatedAt: now,
      },
    });

    return {
      lesson_id: lesson.id,
      video_completed: updatedProgress.videoCompleted,
      is_completed: updatedProgress.isCompleted,
      completed_at: updatedProgress.completedAt,
      best_quiz_score: bestQuizScore,
    };
  }
}
