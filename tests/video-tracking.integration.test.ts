import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { POST as videoCompleteByIdRoute } from '@/app/api/v1/lessons/[id]/video-complete/route';
import { POST as videoCompleteBySlugRoute } from '@/app/api/v1/courses/[slug]/lessons/[lessonSlug]/video-complete/route';
import { NextRequest } from 'next/server';

describe('Phase 3 YouTube Video Tracking API Integration Tests', () => {
  let studentUser: any;
  let studentToken: string;
  let sampleLesson: any;
  let sampleCourse: any;

  beforeAll(async () => {
    studentUser = await db.user.upsert({
      where: { email: 'video.tracking.integration@example.com' },
      update: {},
      create: {
        email: 'video.tracking.integration@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordVideoTracking1234567890',
        fullName: 'Video Tracking Integration Student',
        role: 'student',
      },
    });

    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    sampleCourse = await db.course.findFirst({
      where: { slug: 'english-for-confident-speaking' },
    });

    sampleLesson = await db.lesson.findFirst({
      where: { slug: 'mindset-fluency-over-perfection' },
      include: { quiz: true },
    });
  });

  beforeEach(async () => {
    await db.quizAttempt.deleteMany({
      where: { userId: studentUser.id },
    });
    await db.lessonProgress.deleteMany({
      where: { userId: studentUser.id },
    });
  });

  it('POST /api/v1/lessons/:id/video-complete should reject unauthenticated requests with 401', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${sampleLesson.id}/video-complete`,
      {
        method: 'POST',
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: sampleLesson.id },
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/lessons/:id/video-complete should return 404 for non-existent lesson', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/lessons/00000000-0000-0000-0000-000000000000/video-complete',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('LESSON_NOT_FOUND');
  });

  it('POST /api/v1/lessons/:id/video-complete should record video_completed = true in database', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${sampleLesson.id}/video-complete`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playback_seconds: 180 }),
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: sampleLesson.id },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.lesson_id).toBe(sampleLesson.id);
    expect(json.data.video_completed).toBe(true);
    expect(json.data.is_completed).toBe(false); // No quiz passed yet

    // Verify database record
    const progress = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: studentUser.id,
          lessonId: sampleLesson.id,
        },
      },
    });
    expect(progress).not.toBeNull();
    expect(progress!.videoCompleted).toBe(true);
    expect(progress!.videoCompletedAt).not.toBeNull();
    expect(progress!.isCompleted).toBe(false);
  });

  it('POST /api/v1/lessons/:id/video-complete should reject invalid telemetry payload with 400', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${sampleLesson.id}/video-complete`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playback_seconds: 'not-a-number' }),
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: sampleLesson.id },
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/courses/:slug/lessons/:lessonSlug/video-complete - Hierarchical Slug Route', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/courses/${sampleCourse.slug}/lessons/${sampleLesson.slug}/video-complete`,
      {
        method: 'POST',
        headers: {
          cookie: `auth_token=${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playback_seconds: 300 }),
      }
    );

    const res = await videoCompleteBySlugRoute(req, {
      params: {
        slug: sampleCourse.slug,
        lessonSlug: sampleLesson.slug,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.lesson_id).toBe(sampleLesson.id);
    expect(json.data.video_completed).toBe(true);
  });

  it('POST /api/v1/courses/:slug/lessons/:lessonSlug/video-complete - 404 on invalid course or lesson slug', async () => {
    // 1. Invalid course slug
    const req1 = new NextRequest('http://localhost:3000/api/v1/courses/fake-course/lessons/fake-lesson/video-complete', {
      method: 'POST',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    const res1 = await videoCompleteBySlugRoute(req1, {
      params: { slug: 'fake-course', lessonSlug: 'fake-lesson' },
    });
    expect(res1.status).toBe(404);

    // 2. Valid course slug but invalid lesson slug
    const req2 = new NextRequest(`http://localhost:3000/api/v1/courses/${sampleCourse.slug}/lessons/fake-lesson/video-complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    const res2 = await videoCompleteBySlugRoute(req2, {
      params: { slug: sampleCourse.slug, lessonSlug: 'fake-lesson' },
    });
    expect(res2.status).toBe(404);
  });

  it('Dual-Trigger Verification: video completion completes lesson ONLY if quiz passed (>= 70)', async () => {
    // Scenario 1: Quiz already passed with score 100
    await db.quizAttempt.create({
      data: {
        userId: studentUser.id,
        quizId: sampleLesson.quiz.id,
        score: 100,
        isPassed: true,
        answersPayload: [],
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${sampleLesson.id}/video-complete`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: sampleLesson.id },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.video_completed).toBe(true);
    expect(json.data.best_quiz_score).toBe(100);
    expect(json.data.is_completed).toBe(true); // Complete because (video_completed && best_quiz_score >= 70)

    const dbProgress = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId: studentUser.id,
          lessonId: sampleLesson.id,
        },
      },
    });
    expect(dbProgress!.isCompleted).toBe(true);
    expect(dbProgress!.completedAt).not.toBeNull();
  });
});
