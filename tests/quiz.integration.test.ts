import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { GET as getQuizByIdRoute } from '@/app/api/v1/quizzes/[id]/route';
import { POST as submitQuizByIdRoute } from '@/app/api/v1/quizzes/[id]/submit/route';
import { GET as getAttemptsByIdRoute } from '@/app/api/v1/quizzes/[id]/attempts/route';
import { GET as getQuizBySlugRoute } from '@/app/api/v1/courses/[slug]/lessons/[lessonSlug]/quiz/route';
import { POST as submitQuizBySlugRoute } from '@/app/api/v1/courses/[slug]/lessons/[lessonSlug]/quiz/submit/route';
import { POST as videoCompleteByIdRoute } from '@/app/api/v1/lessons/[id]/video-complete/route';
import { NextRequest } from 'next/server';

describe('Phase 5 Checkpoint Quiz & Completion Engine Integration Tests', () => {
  let studentUserA: any;
  let studentTokenA: string;
  let studentUserB: any;
  let studentTokenB: string;

  let targetQuiz: any;
  let targetLesson: any;
  let targetCourse: any;
  let foreignQuiz: any;

  beforeAll(async () => {
    // 1. Create or upsert test users
    studentUserA = await db.user.upsert({
      where: { email: 'phase5.studentA@example.com' },
      update: {},
      create: {
        email: 'phase5.studentA@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordPhase5TestA1234567890',
        fullName: 'Phase 5 Student User A',
        role: 'student',
      },
    });

    studentTokenA = signToken({
      userId: studentUserA.id,
      email: studentUserA.email,
      role: 'student',
    });

    studentUserB = await db.user.upsert({
      where: { email: 'phase5.studentB@example.com' },
      update: {},
      create: {
        email: 'phase5.studentB@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordPhase5TestB1234567890',
        fullName: 'Phase 5 Student User B',
        role: 'student',
      },
    });

    studentTokenB = signToken({
      userId: studentUserB.id,
      email: studentUserB.email,
      role: 'student',
    });

    // 2. Fetch target quiz for lesson 1 (Mindset Fluency over Perfection)
    targetLesson = await db.lesson.findFirst({
      where: { slug: 'mindset-fluency-over-perfection' },
      include: {
        module: {
          include: {
            course: true,
          },
        },
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    targetCourse = targetLesson.module.course;
    targetQuiz = targetLesson.quiz;

    // Fetch a second quiz for cross-quiz tests
    foreignQuiz = await db.quiz.findFirst({
      where: {
        id: { not: targetQuiz.id },
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    // Clean any prior attempts for test users
    await db.quizAttempt.deleteMany({
      where: {
        userId: { in: [studentUserA.id, studentUserB.id] },
      },
    });
    await db.lessonProgress.deleteMany({
      where: {
        userId: { in: [studentUserA.id, studentUserB.id] },
      },
    });
  });

  describe('1. Quiz Retrieval & Anti-Cheat Verification', () => {
    it('GET /api/v1/quizzes/:id should return sanitized quiz payload without isCorrect leakage', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}`,
        {
          headers: { authorization: `Bearer ${studentTokenA}` },
        }
      );

      const res = await getQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(targetQuiz.id);
      expect(json.data.passing_score).toBe(70);
      expect(json.data.questions.length).toBeGreaterThanOrEqual(3);

      // Verify ANTI-CHEAT: Neither isCorrect nor is_correct exists in response
      for (const q of json.data.questions) {
        expect(q.id).toBeDefined();
        expect(q.question_text).toBeDefined();
        for (const opt of q.options) {
          expect(opt.id).toBeDefined();
          expect(opt.option_text).toBeDefined();
          expect((opt as any).isCorrect).toBeUndefined();
          expect((opt as any).is_correct).toBeUndefined();
        }
      }
    });

    it('GET /api/v1/courses/:slug/lessons/:lessonSlug/quiz (Hierarchical Slug Alias) should return identical sanitized payload', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/courses/${targetCourse.slug}/lessons/${targetLesson.slug}/quiz`,
        {
          headers: { authorization: `Bearer ${studentTokenA}` },
        }
      );

      const res = await getQuizBySlugRoute(req, {
        params: { slug: targetCourse.slug, lessonSlug: targetLesson.slug },
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(targetQuiz.id);
      expect(json.data.questions.length).toBe(targetQuiz.questions.length);
    });

    it('GET /api/v1/quizzes/:id should reject unauthenticated requests with 401', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}`
      );
      const res = await getQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Server-Side Zod Validation & Tampering Rejection', () => {
    it('should reject non-array answers in payload with 400 VALIDATION_ERROR', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ answers: 'invalid-string' }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject malformed question_id in payload with 400 VALIDATION_ERROR', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            answers: [{ question_id: '', selected_option_id: 'opt_123' }],
          }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-existent question_id with 400 INVALID_QUESTION_ID', async () => {
      const invalidQuestionId = '00000000-0000-0000-0000-000000000000';
      const validOptionId = targetQuiz.questions[0].options[0].id;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            answers: [
              { question_id: invalidQuestionId, selected_option_id: validOptionId },
            ],
          }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_QUESTION_ID');
    });

    it('should reject cross-quiz question_id with 400 INVALID_QUESTION_ID', async () => {
      const foreignQuestion = foreignQuiz.questions[0];
      const validOptionId = foreignQuestion.options[0].id;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            answers: [
              { question_id: foreignQuestion.id, selected_option_id: validOptionId },
            ],
          }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_QUESTION_ID');
    });

    it('should reject non-existent selected_option_id with 400 INVALID_OPTION_ID', async () => {
      const validQuestionId = targetQuiz.questions[0].id;
      const invalidOptionId = '00000000-0000-0000-0000-000000000000';

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            answers: [
              { question_id: validQuestionId, selected_option_id: invalidOptionId },
            ],
          }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_OPTION_ID');
    });

    it('should reject cross-question selected_option_id with 400 INVALID_OPTION_ID', async () => {
      const question1 = targetQuiz.questions[0];
      const question2 = targetQuiz.questions[1];
      const optionFromQuestion2 = question2.options[0].id;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            answers: [
              { question_id: question1.id, selected_option_id: optionFromQuestion2 },
            ],
          }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_OPTION_ID');
    });

    it('should reject duplicate questions in payload with 400 VALIDATION_ERROR', async () => {
      const question1 = targetQuiz.questions[0];
      const option1 = question1.options[0].id;
      const option2 = question1.options[1].id;

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            answers: [
              { question_id: question1.id, selected_option_id: option1 },
              { question_id: question1.id, selected_option_id: option2 },
            ],
          }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Grading, Atomic Submission & Attempt Persistence', () => {
    it('should grade 100% when all correct options are submitted and persist attempt', async () => {
      const correctAnswers = targetQuiz.questions.map((q: any) => ({
        question_id: q.id,
        selected_option_id: q.options.find((o: any) => o.isCorrect).id,
      }));

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ answers: correctAnswers }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.score).toBe(100);
      expect(json.data.is_passed).toBe(true);
      expect(json.data.best_score).toBe(100);
      expect(json.data.total_attempts).toBe(1);
      expect(json.data.feedback.length).toBe(targetQuiz.questions.length);

      // Verify DB attempt row
      const attemptInDb = await db.quizAttempt.findUnique({
        where: { id: json.data.attempt_id },
      });
      expect(attemptInDb).toBeDefined();
      expect(attemptInDb!.score).toBe(100);
      expect(attemptInDb!.isPassed).toBe(true);
      expect(attemptInDb!.userId).toBe(studentUserA.id);
    });

    it('should maintain highest best_score after retake with lower score', async () => {
      // User A submits all wrong answers
      const wrongAnswers = targetQuiz.questions.map((q: any) => ({
        question_id: q.id,
        selected_option_id: q.options.find((o: any) => !o.isCorrect).id,
      }));

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenA}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ answers: wrongAnswers }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.score).toBe(0);
      expect(json.data.is_passed).toBe(false);
      // Monotonic best score remains 100 from attempt 1
      expect(json.data.best_score).toBe(100);
      expect(json.data.total_attempts).toBe(2);
    });

    it('GET /api/v1/quizzes/:id/attempts should return user attempt history', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/attempts`,
        {
          headers: { authorization: `Bearer ${studentTokenA}` },
        }
      );

      const res = await getAttemptsByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.total_attempts).toBe(2);
      expect(json.data.best_score).toBe(100);
      expect(json.data.has_passed).toBe(true);
      expect(json.data.attempts.length).toBe(2);
    });

    it('POST /api/v1/courses/:slug/lessons/:lessonSlug/quiz/submit (Hierarchical Route) should grade and submit successfully', async () => {
      const correctAnswers = targetQuiz.questions.map((q: any) => ({
        question_id: q.id,
        selected_option_id: q.options.find((o: any) => o.isCorrect).id,
      }));

      const req = new NextRequest(
        `http://localhost:3000/api/v1/courses/${targetCourse.slug}/lessons/${targetLesson.slug}/quiz/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenB}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ answers: correctAnswers }),
        }
      );

      const res = await submitQuizBySlugRoute(req, {
        params: { slug: targetCourse.slug, lessonSlug: targetLesson.slug },
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.score).toBe(100);
      expect(json.data.is_passed).toBe(true);
      expect(json.data.total_attempts).toBe(1);
    });
  });

  describe('4. Dual-Trigger Lesson Completion Engine & Concurrency Hardening (PRD-02 & PRD-03)', () => {
    it('Case A: Quiz passed first -> Lesson incomplete until Video completed', async () => {
      // User B has quiz score = 100, but videoCompleted = false
      const progressBeforeVideo = await db.lessonProgress.findUnique({
        where: {
          uq_user_lesson_progress: {
            userId: studentUserB.id,
            lessonId: targetLesson.id,
          },
        },
      });
      expect(progressBeforeVideo?.videoCompleted).toBe(false);
      expect(progressBeforeVideo?.isCompleted).toBe(false);

      // Now User B completes video using actual Phase 3 endpoint
      const req = new NextRequest(
        `http://localhost:3000/api/v1/lessons/${targetLesson.id}/video-complete`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenB}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ playback_seconds: 180 }),
        }
      );

      const videoRes = await videoCompleteByIdRoute(req, {
        params: { id: targetLesson.id },
      });

      expect(videoRes.status).toBe(200);
      const videoJson = await videoRes.json();
      expect(videoJson.success).toBe(true);
      expect(videoJson.data.video_completed).toBe(true);
      expect(videoJson.data.is_completed).toBe(true);

      const progressAfterVideo = await db.lessonProgress.findUnique({
        where: {
          uq_user_lesson_progress: {
            userId: studentUserB.id,
            lessonId: targetLesson.id,
          },
        },
      });
      expect(progressAfterVideo?.videoCompleted).toBe(true);
      expect(progressAfterVideo?.isCompleted).toBe(true);
    });

    it('Case B: Once isCompleted is true, lower-score quiz retake keeps isCompleted = true', async () => {
      const wrongAnswers = targetQuiz.questions.map((q: any) => ({
        question_id: q.id,
        selected_option_id: q.options.find((o: any) => !o.isCorrect).id,
      }));

      const req = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${studentTokenB}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ answers: wrongAnswers }),
        }
      );

      const res = await submitQuizByIdRoute(req, { params: { id: targetQuiz.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.score).toBe(0);
      expect(json.data.lesson_completion.is_completed).toBe(true);

      const progress = await db.lessonProgress.findUnique({
        where: {
          uq_user_lesson_progress: {
            userId: studentUserB.id,
            lessonId: targetLesson.id,
          },
        },
      });
      expect(progress?.isCompleted).toBe(true);
    });

    it('Case C: Concurrent submission hardening - concurrent submissions with lower scores preserve isCompleted = true and best_score', async () => {
      const wrongAnswers = targetQuiz.questions.map((q: any) => ({
        question_id: q.id,
        selected_option_id: q.options.find((o: any) => !o.isCorrect).id,
      }));

      // Launch 5 concurrent submissions simultaneously
      const concurrentRequests = Array.from({ length: 5 }).map(() =>
        submitQuizByIdRoute(
          new NextRequest(
            `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/submit`,
            {
              method: 'POST',
              headers: {
                authorization: `Bearer ${studentTokenB}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify({ answers: wrongAnswers }),
            }
          ),
          { params: { id: targetQuiz.id } }
        )
      );

      const responses = await Promise.all(concurrentRequests);

      for (const res of responses) {
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.best_score).toBe(100);
        expect(json.data.lesson_completion.is_completed).toBe(true);
      }

      // Verify DB progress state is pristine
      const finalProgress = await db.lessonProgress.findUnique({
        where: {
          uq_user_lesson_progress: {
            userId: studentUserB.id,
            lessonId: targetLesson.id,
          },
        },
      });
      expect(finalProgress?.isCompleted).toBe(true);
      expect(finalProgress?.videoCompleted).toBe(true);
    });

    it('Case D: User isolation - User A cannot see or mutate User B attempts', async () => {
      const reqA = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/attempts`,
        {
          headers: { authorization: `Bearer ${studentTokenA}` },
        }
      );
      const resA = await getAttemptsByIdRoute(reqA, { params: { id: targetQuiz.id } });
      const jsonA = await resA.json();

      const reqB = new NextRequest(
        `http://localhost:3000/api/v1/quizzes/${targetQuiz.id}/attempts`,
        {
          headers: { authorization: `Bearer ${studentTokenB}` },
        }
      );
      const resB = await getAttemptsByIdRoute(reqB, { params: { id: targetQuiz.id } });
      const jsonB = await resB.json();

      expect(jsonA.data.attempts.length).toBe(2);
      expect(jsonB.data.attempts.length).toBe(7);
      expect(jsonA.data.attempts[0].id).not.toBe(jsonB.data.attempts[0].id);
    });
  });
});
