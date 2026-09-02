import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { ProgressService } from '@/services/progress.service';

describe('ProgressService Unit Tests (Phase 3)', () => {
  let sampleUserId: string;
  let sampleLessonId: string;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: 'progress.unit.test@example.com' },
      update: {},
      create: {
        email: 'progress.unit.test@example.com',
        passwordHash: '$2a$12$dummyPasswordForProgressTest1234567890',
        fullName: 'Progress Unit Test Student',
        role: 'student',
      },
    });
    sampleUserId = user.id;

    const lesson = await db.lesson.findFirst({
      where: { slug: 'mindset-fluency-over-perfection' },
    });
    sampleLessonId = lesson!.id;
  });

  it('markVideoCompleted should persist video_completed=true without prematurely setting is_completed=true', async () => {
    const result = await ProgressService.markVideoCompleted(sampleUserId, sampleLessonId, {
      playback_seconds: 120,
    });

    expect(result.video_completed).toBe(true);
    expect(result.video_completed_at).toBeDefined();
    // Strict Rule: No quiz passed yet, so is_completed MUST be false
    expect(result.is_completed).toBe(false);
    expect(result.completed_at).toBeNull();
    expect(result.best_quiz_score).toBeNull();

    // Verify in DB directly
    const progressInDb = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: sampleUserId,
          lessonId: sampleLessonId,
        },
      },
    });

    expect(progressInDb).not.toBeNull();
    expect(progressInDb?.videoCompleted).toBe(true);
    expect(progressInDb?.isCompleted).toBe(false);
  });

  it('markVideoCompleted should be idempotent on repeated invocations', async () => {
    const result1 = await ProgressService.markVideoCompleted(sampleUserId, sampleLessonId);
    const result2 = await ProgressService.markVideoCompleted(sampleUserId, sampleLessonId);

    expect(result1.video_completed).toBe(true);
    expect(result2.video_completed).toBe(true);
    expect(result2.is_completed).toBe(false);

    // Verify only 1 progress row exists
    const count = await db.lessonProgress.count({
      where: {
        userId: sampleUserId,
        lessonId: sampleLessonId,
      },
    });
    expect(count).toBe(1);
  });

  it('markVideoCompleted should throw 404 for non-existent lesson', async () => {
    await expect(
      ProgressService.markVideoCompleted(
        sampleUserId,
        '00000000-0000-0000-0000-000000000000'
      )
    ).rejects.toThrowError(/Lesson tidak ditemukan/);
  });
});
