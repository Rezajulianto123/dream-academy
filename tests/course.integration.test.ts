import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { GET as getCoursesRoute } from '@/app/api/v1/courses/route';
import { GET as getCourseDetailRoute } from '@/app/api/v1/courses/[slug]/route';
import { POST as enrollRoute } from '@/app/api/v1/courses/[slug]/enroll/route';
import { GET as getLessonRoute } from '@/app/api/v1/courses/[slug]/lessons/[lessonSlug]/route';
import { GET as getLessonByIdRoute } from '@/app/api/v1/lessons/[id]/route';
import { NextRequest } from 'next/server';

describe('Phase 2 Course & Syllabus API Integration Tests', () => {
  let studentUser: any;
  let studentToken: string;

  beforeAll(async () => {
    studentUser = await db.user.upsert({
      where: { email: 'phase2.integration@example.com' },
      update: {},
      create: {
        email: 'phase2.integration@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordPhase2Test1234567890',
        fullName: 'Phase 2 Integration Student',
        role: 'student',
      },
    });

    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });
  });

  it('GET /api/v1/courses should return published courses list', async () => {
    const res = await getCoursesRoute();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    const course = json.data[0];
    expect(course.slug).toBe('english-for-confident-speaking');
    expect(course.total_modules).toBe(2);
    expect(course.total_lessons).toBe(4);
  });

  it('GET /api/v1/courses/:slug should return course syllabus detail', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/courses/english-for-confident-speaking',
      {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      }
    );

    const res = await getCourseDetailRoute(req, {
      params: { slug: 'english-for-confident-speaking' },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.slug).toBe('english-for-confident-speaking');
    expect(json.data.modules.length).toBe(2);
    expect(json.data.modules[0].lessons.length).toBe(2);
    expect(json.data.modules[1].lessons.length).toBe(2);
  });

  it('POST /api/v1/courses/:slug/enroll should enroll student idempotently', async () => {
    const req1 = new NextRequest(
      'http://localhost:3000/api/v1/courses/english-for-confident-speaking/enroll',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      }
    );

    const res1 = await enrollRoute(req1, {
      params: { slug: 'english-for-confident-speaking' },
    });

    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);
    expect(json1.data.enrollment_id).toBeDefined();

    // Re-enroll (idempotency check)
    const req2 = new NextRequest(
      'http://localhost:3000/api/v1/courses/english-for-confident-speaking/enroll',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      }
    );

    const res2 = await enrollRoute(req2, {
      params: { slug: 'english-for-confident-speaking' },
    });

    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.data.enrollment_id).toBe(json1.data.enrollment_id);
  });

  it('GET /api/v1/courses/:slug/lessons/:lessonSlug - Free Navigation: Access Lesson 3 directly', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/courses/english-for-confident-speaking/lessons/small-talk-membuka-obrolan',
      {
        method: 'GET',
        headers: {
          cookie: `auth_token=${studentToken}`,
        },
      }
    );

    const res = await getLessonRoute(req, {
      params: {
        slug: 'english-for-confident-speaking',
        lessonSlug: 'small-talk-membuka-obrolan',
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.slug).toBe('small-talk-membuka-obrolan');
    expect(json.data.title).toBe('Lesson 3: Small Talk & Membuka Obrolan Santai');
    expect(json.data.youtube_video_id).toBe('L_LUpnjgPso');
    expect(json.data.speaking_prompt).toBeDefined();
    expect(json.data.summary_content).toBeDefined();
    expect(json.data.syllabus.length).toBe(2);
  });

  it('GET /api/v1/courses/:slug/lessons/:lessonSlug should reject unauthenticated access with 401', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/courses/english-for-confident-speaking/lessons/small-talk-membuka-obrolan',
      {
        method: 'GET',
      }
    );

    const res = await getLessonRoute(req, {
      params: {
        slug: 'english-for-confident-speaking',
        lessonSlug: 'small-talk-membuka-obrolan',
      },
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/lessons/:id should return lesson by UUID', async () => {
    const lessonInDb = await db.lesson.findFirst({
      where: { slug: 'mindset-fluency-over-perfection' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/v1/lessons/${lessonInDb!.id}`,
      {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      }
    );

    const res = await getLessonByIdRoute(req, {
      params: { id: lessonInDb!.id },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(lessonInDb!.id);
    expect(json.data.slug).toBe('mindset-fluency-over-perfection');
  });
});
