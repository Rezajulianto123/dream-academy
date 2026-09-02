import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { POST as videoCompleteByIdRoute } from '@/app/api/v1/lessons/[id]/video-complete/route';
import { POST as videoCompleteBySlugRoute } from '@/app/api/v1/courses/[slug]/lessons/[lessonSlug]/video-complete/route';
import { NextRequest } from 'next/server';

describe('Phase 3 YouTube Video Completion API Integration Tests', () => {
  let studentUser: any;
  let studentToken: string;
  let targetLesson: any;

  beforeAll(async () => {
    studentUser = await db.user.upsert({
      where: { email: 'phase3.video.test@example.com' },
      update: {},
      create: {
        email: 'phase3.video.test@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordPhase3Test1234567890',
        fullName: 'Phase 3 Video Test Student',
        role: 'student',
      },
    });

    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    targetLesson = await db.lesson.findFirst({
      where: { slug: 'self-introduction-natural' },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });
  });

  it('POST /api/v1/lessons/:id/video-complete should mark video completed', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${targetLesson.id}/video-complete`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ playback_seconds: 145.2 }),
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: targetLesson.id },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.lesson_id).toBe(targetLesson.id);
    expect(json.data.video_completed).toBe(true);
    expect(json.data.video_completed_at).toBeDefined();
    // Non-premature lesson completion check
    expect(json.data.is_completed).toBe(false);
  });

  it('POST /api/v1/courses/:slug/lessons/:lessonSlug/video-complete (Hierarchical Alias Route) should mark video completed', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/courses/${targetLesson.module.course.slug}/lessons/${targetLesson.slug}/video-complete`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ playback_seconds: 210 }),
      }
    );

    const res = await videoCompleteBySlugRoute(req, {
      params: {
        slug: targetLesson.module.course.slug,
        lessonSlug: targetLesson.slug,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.lesson_id).toBe(targetLesson.id);
    expect(json.data.video_completed).toBe(true);
    expect(json.data.is_completed).toBe(false);
  });

  it('POST /api/v1/lessons/:id/video-complete should reject unauthenticated requests with 401', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${targetLesson.id}/video-complete`,
      {
        method: 'POST',
      }
    );

    const res = await videoCompleteByIdRoute(req, {
      params: { id: targetLesson.id },
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/lessons/:id/video-complete should return 404 for invalid lesson id', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/00000000-0000-0000-0000-000000000000/video-complete`,
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
});
