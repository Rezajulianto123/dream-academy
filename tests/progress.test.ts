import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { ProgressService } from '@/services/progress.service';

describe('ProgressService & Video Tracking (Unit Tests)', () => {
  let testUser: any;
  let testLesson1: any;
  let testLesson2: any;
  let testQuiz1: any;
  let testQuiz2: any;

  beforeAll(async () => {
    testUser = await db.user.upsert({
      where: { email: 'progress.unit.test@example.com' },
      update: {},
      create: {
        email: 'progress.unit.test@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordProgress1234567890',
        fullName: 'Progress Unit Test User',
        role: 'student',
      },
    });

    testLesson1 = await db.lesson.findFirst({
      where: { slug: 'mindset-fluency-over-perfection' },
      include: { quiz: true },
    });

    testLesson2 = await db.lesson.findFirst({
      where: { slug: 'self-introduction-natural' },
      include: { quiz: true },
    });

    testQuiz1 = testLesson1.quiz;
    testQuiz2 = testLesson2.quiz;
  });

  beforeEach(async () => {
    // Clean up lesson progress and quiz attempts for testUser before each test
    await db.quizAttempt.deleteMany({
      where: { userId: testUser.id },
    });
    await db.lessonProgress.deleteMany({
      where: { userId: testUser.id },
    });
  });

  it('markVideoComplete should set videoCompleted = true and record timestamp', async () => {
    const result = await ProgressService.markVideoComplete(testUser.id, testLesson1.id, {
      playback_seconds: 320,
    });

    expect(result.lesson_id).toBe(testLesson1.id);
    expect(result.video_completed).toBe(true);
    expect(result.is_completed).toBe(false); // No quiz completed yet -> is_completed must be false
    expect(result.best_quiz_score).toBeNull();
    expect(result.message).toBe('Status pemutaran video berhasil disimpan.');

    // Check database state
    const progressInDb = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: testUser.id,
          lessonId: testLesson1.id,
        },
      },
    });
    expect(progressInDb).not.toBeNull();
    expect(progressInDb!.videoCompleted).toBe(true);
    expect(progressInDb!.videoCompletedAt).not.toBeNull();
    expect(progressInDb!.isCompleted).toBe(false);
    expect(progressInDb!.completedAt).toBeNull();
  });

  it('markVideoComplete should be idempotent and preserve original completion timestamp', async () => {
    // 1st call
    const res1 = await ProgressService.markVideoComplete(testUser.id, testLesson1.id);
    expect(res1.video_completed).toBe(true);

    const firstDbRecord = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: testUser.id,
          lessonId: testLesson1.id,
        },
      },
    });
    const firstTimestamp = firstDbRecord!.videoCompletedAt!.getTime();

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 2nd call
    const res2 = await ProgressService.markVideoComplete(testUser.id, testLesson1.id);
    expect(res2.video_completed).toBe(true);

    const secondDbRecord = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: testUser.id,
          lessonId: testLesson1.id,
        },
      },
    });
    expect(secondDbRecord!.videoCompletedAt!.getTime()).toBe(firstTimestamp);
  });

  it('markVideoComplete must NOT mark is_completed = true if quiz score < 70', async () => {
    // Create failing quiz attempt (score 50)
    await db.quizAttempt.create({
      data: {
        userId: testUser.id,
        quizId: testQuiz1.id,
        score: 50,
        isPassed: false,
        answersPayload: [],
      },
    });

    const result = await ProgressService.markVideoComplete(testUser.id, testLesson1.id);

    expect(result.video_completed).toBe(true);
    expect(result.best_quiz_score).toBe(50);
    expect(result.is_completed).toBe(false); // Dual-trigger not satisfied

    const dbRecord = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: testUser.id,
          lessonId: testLesson1.id,
        },
      },
    });
    expect(dbRecord!.isCompleted).toBe(false);
    expect(dbRecord!.completedAt).toBeNull();
  });

  it('markVideoComplete MUST mark is_completed = true when quiz score >= 70 (Dual-Trigger)', async () => {
    // Create passing quiz attempt (score 80)
    await db.quizAttempt.create({
      data: {
        userId: testUser.id,
        quizId: testQuiz1.id,
        score: 80,
        isPassed: true,
        answersPayload: [],
      },
    });

    const result = await ProgressService.markVideoComplete(testUser.id, testLesson1.id);

    expect(result.video_completed).toBe(true);
    expect(result.best_quiz_score).toBe(80);
    expect(result.is_completed).toBe(true); // Satisfies (video_completed && best_quiz_score >= 70)

    const dbRecord = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: testUser.id,
          lessonId: testLesson1.id,
        },
      },
    });
    expect(dbRecord!.isCompleted).toBe(true);
    expect(dbRecord!.completedAt).not.toBeNull();
  });

  it('markVideoComplete should reject non-existent lesson with 404 LESSON_NOT_FOUND', async () => {
    await expect(
      ProgressService.markVideoComplete(
        testUser.id,
        '00000000-0000-0000-0000-000000000000'
      )
    ).rejects.toThrowError(/Lesson tidak ditemukan/);
  });

  it('getLessonProgress should return accurate state and attempt stats', async () => {
    // 1. Initially no progress
    const initProg = await ProgressService.getLessonProgress(testUser.id, testLesson2.id);
    expect(initProg.video_completed).toBe(false);
    expect(initProg.is_completed).toBe(false);
    expect(initProg.best_quiz_score).toBeNull();
    expect(initProg.total_quiz_attempts).toBe(0);

    // 2. Add multiple quiz attempts: 60 and 90
    await db.quizAttempt.create({
      data: {
        userId: testUser.id,
        quizId: testQuiz2.id,
        score: 60,
        isPassed: false,
      },
    });
    await db.quizAttempt.create({
      data: {
        userId: testUser.id,
        quizId: testQuiz2.id,
        score: 90,
        isPassed: true,
      },
    });

    // Mark video complete
    await ProgressService.markVideoComplete(testUser.id, testLesson2.id);

    const updatedProg = await ProgressService.getLessonProgress(testUser.id, testLesson2.id);
    expect(updatedProg.video_completed).toBe(true);
    expect(updatedProg.is_completed).toBe(true);
    expect(updatedProg.best_quiz_score).toBe(90);
    expect(updatedProg.total_quiz_attempts).toBe(2);
  });

  it('evaluateLessonCompletion should re-evaluate completion status accurately', async () => {
    // Case A: video completed = true, quiz score = 0 -> is_completed = false
    await ProgressService.markVideoComplete(testUser.id, testLesson1.id);
    let evalRes = await ProgressService.evaluateLessonCompletion(testUser.id, testLesson1.id);
    expect(evalRes.is_completed).toBe(false);

    // Case B: Now user passes quiz with 100 -> evaluate -> is_completed = true
    await db.quizAttempt.create({
      data: {
        userId: testUser.id,
        quizId: testQuiz1.id,
        score: 100,
        isPassed: true,
      },
    });

    evalRes = await ProgressService.evaluateLessonCompletion(testUser.id, testLesson1.id);
    expect(evalRes.is_completed).toBe(true);
    expect(evalRes.best_quiz_score).toBe(100);
    expect(evalRes.completed_at).toBeDefined();
  });
});
