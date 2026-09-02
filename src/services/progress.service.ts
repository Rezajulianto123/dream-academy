import { db } from '@/lib/db';
import { EnrollmentService } from './enrollment.service';

export class ProgressService {
  static async markVideoCompleted(
    userId: string,
    lessonId: string,
    telemetry?: { playback_seconds?: number }
  ) {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
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

    // Auto-enroll user in course if not already enrolled
    await EnrollmentService.autoEnroll(userId, lesson.module.course.id);

    // Check if user has passed the quiz for this lesson
    let bestScore: number | null = null;
    let hasPassedQuiz = false;

    if (lesson.quiz) {
      const attempts = await db.quizAttempt.findMany({
        where: {
          userId,
          quizId: lesson.quiz.id,
        },
        select: { score: true },
      });

      if (attempts.length > 0) {
        bestScore = Math.max(...attempts.map((a) => a.score));
        if (bestScore >= lesson.quiz.passingScore) {
          hasPassedQuiz = true;
        }
      }
    }

    // Dual-trigger completion rule (PRD-02):
    // isCompleted ONLY when video_completed == true AND best_quiz_score >= passingScore
    const isCompleted = hasPassedQuiz;
    const now = new Date();

    const progress = await db.lessonProgress.upsert({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
      update: {
        videoCompleted: true,
        videoCompletedAt: now,
        isCompleted,
        ...(isCompleted ? { completedAt: now } : {}),
      },
      create: {
        userId,
        lessonId,
        videoCompleted: true,
        videoCompletedAt: now,
        isCompleted,
        ...(isCompleted ? { completedAt: now } : {}),
      },
    });

    return {
      lesson_id: lesson.id,
      video_completed: progress.videoCompleted,
      video_completed_at: progress.videoCompletedAt,
      is_completed: progress.isCompleted,
      completed_at: progress.completedAt,
      best_quiz_score: bestScore,
      message: 'Status pemutaran video berhasil disimpan.',
    };
  }

  static async getLessonProgress(userId: string, lessonId: string) {
    return db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId,
        },
      },
    });
  }
}
