import { db } from '@/lib/db';
import { EnrollmentService } from './enrollment.service';
import { z } from 'zod';

export interface QuizAnswerSubmission {
  question_id: string;
  selected_option_id: string;
}

export const QuizAnswerSchema = z.object({
  question_id: z
    .string({
      required_error: 'question_id wajib berupa string',
      invalid_type_error: 'question_id harus berupa string',
    })
    .min(1, 'question_id tidak boleh kosong'),
  selected_option_id: z
    .string({
      required_error: 'selected_option_id wajib berupa string',
      invalid_type_error: 'selected_option_id harus berupa string',
    })
    .min(1, 'selected_option_id tidak boleh kosong'),
});

export const QuizSubmissionSchema = z.object({
  answers: z
    .array(QuizAnswerSchema, {
      required_error: 'answers wajib berupa array',
      invalid_type_error: 'answers harus berupa array',
    })
    .min(1, 'answers tidak boleh kosong'),
});

export class QuizService {
  /**
   * Retrieves quiz details sanitized for client (Anti-Cheat: without isCorrect).
   */
  static async getQuizById(quizId: string, userId: string) {
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                optionText: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });

    if (
      !quiz ||
      !quiz.lesson.isPublished ||
      !quiz.lesson.module.isPublished ||
      !quiz.lesson.module.course.isPublished
    ) {
      const error: any = new Error('Kuis tidak ditemukan.');
      error.code = 'QUIZ_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Auto-enroll user in course if needed
    await EnrollmentService.autoEnroll(userId, quiz.lesson.module.course.id);

    // Fetch user attempt history to compute best_score & total_attempts
    const attempts = await db.quizAttempt.findMany({
      where: {
        userId,
        quizId: quiz.id,
      },
      select: { score: true },
    });

    const totalAttempts = attempts.length;
    const bestScore = totalAttempts > 0 ? Math.max(...attempts.map((a) => a.score)) : null;
    const hasPassed = bestScore !== null && bestScore >= quiz.passingScore;

    return {
      id: quiz.id,
      lesson_id: quiz.lessonId,
      lesson_title: quiz.lesson.title,
      course_slug: quiz.lesson.module.course.slug,
      lesson_slug: quiz.lesson.slug,
      title: quiz.title,
      passing_score: quiz.passingScore,
      best_score: bestScore,
      has_passed: hasPassed,
      total_attempts: totalAttempts,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        order_index: q.orderIndex,
        question_text: q.questionText,
        options: q.options.map((opt) => ({
          id: opt.id,
          order_index: opt.orderIndex,
          option_text: opt.optionText,
        })),
      })),
    };
  }

  /**
   * Retrieves quiz by hierarchical course & lesson slug.
   */
  static async getQuizByLessonSlug(courseSlug: string, lessonSlug: string, userId: string) {
    const course = await db.course.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          where: { isPublished: true },
          include: {
            lessons: {
              where: { slug: lessonSlug, isPublished: true },
              include: {
                quiz: true,
              },
            },
          },
        },
      },
    });

    if (!course || !course.isPublished) {
      const error: any = new Error('Kursus tidak ditemukan.');
      error.code = 'COURSE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const lesson = course.modules.flatMap((m) => m.lessons)[0];
    if (!lesson || !lesson.isPublished) {
      const error: any = new Error('Lesson tidak ditemukan.');
      error.code = 'LESSON_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (!lesson.quiz) {
      const error: any = new Error('Kuis untuk lesson ini tidak ditemukan.');
      error.code = 'QUIZ_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return this.getQuizById(lesson.quiz.id, userId);
  }

  /**
   * Submits and grades quiz answers atomically via database transaction.
   */
  static async submitQuiz(
    userId: string,
    quizId: string,
    payload: unknown
  ) {
    // 1. Zod Schema Validation
    const parseResult = QuizSubmissionSchema.safeParse(payload);
    if (!parseResult.success) {
      const error: any = new Error('Payload jawaban kuis tidak valid.');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      error.details = parseResult.error.errors;
      throw error;
    }

    const validatedAnswers = parseResult.data.answers;

    // Check for duplicate question_ids in payload
    const submittedQuestionIds = new Set<string>();
    for (const ans of validatedAnswers) {
      if (submittedQuestionIds.has(ans.question_id)) {
        const error: any = new Error(
          'Payload jawaban mengandung pertanyaan duplikat.'
        );
        error.code = 'VALIDATION_ERROR';
        error.status = 400;
        throw error;
      }
      submittedQuestionIds.add(ans.question_id);
    }

    // Fetch Quiz and all questions & options from DB
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!quiz) {
      const error: any = new Error('Kuis tidak ditemukan.');
      error.code = 'QUIZ_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    if (quiz.questions.length === 0) {
      const error: any = new Error('Kuis belum memiliki butir pertanyaan.');
      error.code = 'QUIZ_EMPTY';
      error.status = 400;
      throw error;
    }

    // 2. Strict Hierarchy & Tampering Validation
    const questionsMap = new Map<string, (typeof quiz.questions)[0]>();
    for (const q of quiz.questions) {
      questionsMap.set(q.id, q);
    }

    for (const ans of validatedAnswers) {
      const question = questionsMap.get(ans.question_id);
      if (!question) {
        const error: any = new Error(
          `Pertanyaan dengan ID '${ans.question_id}' tidak valid atau bukan bagian dari kuis ini.`
        );
        error.code = 'INVALID_QUESTION_ID';
        error.status = 400;
        throw error;
      }

      const optionExists = question.options.some((o) => o.id === ans.selected_option_id);
      if (!optionExists) {
        const error: any = new Error(
          `Pilihan jawaban dengan ID '${ans.selected_option_id}' tidak valid untuk pertanyaan '${ans.question_id}'.`
        );
        error.code = 'INVALID_OPTION_ID';
        error.status = 400;
        throw error;
      }
    }

    // Auto-enroll user in course if needed
    await EnrollmentService.autoEnroll(userId, quiz.lesson.module.course.id);

    // 3. Atomic Database Transaction: Grade -> Create Attempt -> Aggregate Best Score -> Update Lesson Progress
    return db.$transaction(async (tx) => {
      const answersMap = new Map<string, string>();
      for (const ans of validatedAnswers) {
        answersMap.set(ans.question_id, ans.selected_option_id);
      }

      let correctCount = 0;
      const feedback = [];

      for (const question of quiz.questions) {
        const selectedOptionId = answersMap.get(question.id) || null;
        const correctOption = question.options.find((o) => o.isCorrect);

        let isCorrect = false;
        if (selectedOptionId) {
          const chosenOption = question.options.find((o) => o.id === selectedOptionId);
          if (chosenOption && chosenOption.isCorrect) {
            isCorrect = true;
            correctCount++;
          }
        }

        feedback.push({
          question_id: question.id,
          is_correct: isCorrect,
          selected_option_id: selectedOptionId,
          correct_option_id: correctOption ? correctOption.id : null,
          explanation: question.explanation,
        });
      }

      const totalQuestions = quiz.questions.length;
      const score = Math.round((correctCount / totalQuestions) * 100);
      const isPassed = score >= quiz.passingScore;

      // Create new quiz attempt
      const attempt = await tx.quizAttempt.create({
        data: {
          userId,
          quizId: quiz.id,
          score,
          isPassed,
          answersPayload: validatedAnswers as any,
        },
      });

      // Aggregate best score
      const allAttempts = await tx.quizAttempt.findMany({
        where: {
          userId,
          quizId: quiz.id,
        },
        select: { score: true },
      });

      const bestScore = Math.max(...allAttempts.map((a) => a.score));
      const totalAttempts = allAttempts.length;

      // Fetch current lesson progress
      const existingProgress = await tx.lessonProgress.findUnique({
        where: {
          uq_user_lesson_progress: {
            userId,
            lessonId: quiz.lessonId,
          },
        },
      });

      const videoCompleted = existingProgress?.videoCompleted ?? false;
      const hasPassed = bestScore >= quiz.passingScore;
      const alreadyCompleted = existingProgress?.isCompleted ?? false;

      // Dual-trigger completion rule (PRD-02):
      // isCompleted is true if video_completed == true AND best_quiz_score >= 70, or if already completed
      const isCompleted = alreadyCompleted || (videoCompleted && hasPassed);
      const now = new Date();
      const completedAt = alreadyCompleted
        ? existingProgress?.completedAt
        : isCompleted
        ? now
        : null;

      const updatedProgress = await tx.lessonProgress.upsert({
        where: {
          uq_user_lesson_progress: {
            userId,
            lessonId: quiz.lessonId,
          },
        },
        update: {
          isCompleted,
          ...(completedAt ? { completedAt } : {}),
        },
        create: {
          userId,
          lessonId: quiz.lessonId,
          videoCompleted: false,
          isCompleted,
          ...(completedAt ? { completedAt } : {}),
        },
      });

      return {
        attempt_id: attempt.id,
        score,
        is_passed: isPassed,
        best_score: bestScore,
        total_attempts: totalAttempts,
        lesson_completion: {
          video_completed: updatedProgress.videoCompleted,
          is_completed: updatedProgress.isCompleted,
          completed_at: updatedProgress.completedAt,
        },
        feedback,
      };
    });
  }

  /**
   * Retrieves user attempt history for a specific quiz.
   */
  static async getAttemptsHistory(userId: string, quizId: string) {
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, passingScore: true },
    });

    if (!quiz) {
      const error: any = new Error('Kuis tidak ditemukan.');
      error.code = 'QUIZ_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    const attempts = await db.quizAttempt.findMany({
      where: {
        userId,
        quizId,
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        score: true,
        isPassed: true,
        submittedAt: true,
      },
    });

    const totalAttempts = attempts.length;
    const bestScore = totalAttempts > 0 ? Math.max(...attempts.map((a) => a.score)) : null;
    const hasPassed = bestScore !== null && bestScore >= quiz.passingScore;

    return {
      quiz_id: quiz.id,
      best_score: bestScore,
      has_passed: hasPassed,
      total_attempts: totalAttempts,
      attempts: attempts.map((a) => ({
        id: a.id,
        score: a.score,
        is_passed: a.isPassed,
        submitted_at: a.submittedAt,
      })),
    };
  }
}
