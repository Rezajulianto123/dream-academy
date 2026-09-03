import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { extractYoutubeVideoId } from '@/lib/youtube-utils';
import {
  GET as getAdminModules,
  POST as createAdminModule,
} from '@/app/api/v1/admin/courses/[id]/modules/route';
import { PUT as reorderAdminModules } from '@/app/api/v1/admin/courses/[id]/modules/reorder/route';
import {
  GET as getAdminModuleDetail,
  PUT as updateAdminModule,
  DELETE as deleteAdminModule,
} from '@/app/api/v1/admin/modules/[id]/route';
import {
  GET as getAdminLessons,
  POST as createAdminLesson,
} from '@/app/api/v1/admin/modules/[id]/lessons/route';
import { PUT as reorderAdminLessons } from '@/app/api/v1/admin/modules/[id]/lessons/reorder/route';
import {
  GET as getAdminLessonDetail,
  PUT as updateAdminLesson,
  DELETE as deleteAdminLesson,
} from '@/app/api/v1/admin/lessons/[id]/route';
import { GET as getPublicLessonById } from '@/app/api/v1/lessons/[id]/route';
import { GET as getPublicQuizBySlug } from '@/app/api/v1/courses/[slug]/lessons/[lessonSlug]/quiz/route';
import { CourseService } from '@/services/course.service';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

describe('BUILD-06.4 Module & Lesson Content Builder Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let studentUserId: string;

  let testCourseId: string;
  let testModuleId: string;
  let testLessonId: string;

  beforeAll(async () => {
    // 1. Clean up test records
    await db.course.deleteMany({
      where: {
        slug: {
          in: ['curriculum-test-course', 'draft-curriculum-course'],
        },
      },
    });

    // 2. Setup Student
    const studentUser = await db.user.upsert({
      where: { email: 'curriculum_student@test.com' },
      update: { role: 'student' },
      create: {
        email: 'curriculum_student@test.com',
        passwordHash: await bcrypt.hash('StudentSecret123!', 10),
        fullName: 'Curriculum Student User',
        role: 'student',
      },
    });
    studentUserId = studentUser.id;
    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    // 3. Setup Admin
    const adminUser = await db.user.upsert({
      where: { email: 'curriculum_admin@test.com' },
      update: { role: 'admin' },
      create: {
        email: 'curriculum_admin@test.com',
        passwordHash: await bcrypt.hash('AdminSecret123!', 10),
        fullName: 'Curriculum Admin User',
        role: 'admin',
      },
    });
    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });

    // 4. Create base Course for curriculum tests
    const course = await db.course.create({
      data: {
        title: 'Curriculum Test Course',
        slug: 'curriculum-test-course',
        description: 'Test Course Description',
        isPublished: true,
      },
    });
    testCourseId = course.id;
  });

  afterAll(async () => {
    await db.course.deleteMany({
      where: {
        slug: {
          in: ['curriculum-test-course', 'draft-curriculum-course'],
        },
      },
    });
  });

  describe('1. YouTube Video Reference Parser Utility', () => {
    it('should extract 11-char ID from direct ID string', () => {
      expect(extractYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract 11-char ID from standard watch URL', () => {
      expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract 11-char ID from short youtu.be URL', () => {
      expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract 11-char ID from embed URL', () => {
      expect(extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });
  });

  describe('2. Admin Module REST APIs & Reordering', () => {
    it('should reject unauthenticated module requests with HTTP 401', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/courses/${testCourseId}/modules`);
      const res = await getAdminModules(req, { params: { id: testCourseId } });
      expect(res.status).toBe(401);
    });

    it('should reject student module requests with HTTP 403 Forbidden', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/courses/${testCourseId}/modules`, {
        headers: { authorization: `Bearer ${studentToken}` },
      });
      const res = await getAdminModules(req, { params: { id: testCourseId } });
      expect(res.status).toBe(403);
    });

    it('should create a new Module under course via POST', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/courses/${testCourseId}/modules`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Modul Testing 1',
          slug: 'modul-testing-1',
          description: 'Deskripsi Modul 1',
          isPublished: true,
        }),
      });

      const res = await createAdminModule(req, { params: { id: testCourseId } });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Modul Testing 1');
      expect(json.data.isPublished).toBe(true);

      testModuleId = json.data.id;
    });

    it('should reject duplicate module slug within same course with HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/courses/${testCourseId}/modules`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Modul Duplikat',
          slug: 'modul-testing-1', // Duplicate slug
        }),
      });

      const res = await createAdminModule(req, { params: { id: testCourseId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Slug modul sudah digunakan');
    });

    it('should reorder modules via PUT /api/v1/admin/courses/[id]/modules/reorder', async () => {
      // Create second module
      const m2 = await db.module.create({
        data: {
          courseId: testCourseId,
          title: 'Modul Testing 2',
          slug: 'modul-testing-2',
          orderIndex: 1,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/admin/courses/${testCourseId}/modules/reorder`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          moduleIds: [m2.id, testModuleId],
        }),
      });

      const res = await reorderAdminModules(req, { params: { id: testCourseId } });
      expect(res.status).toBe(200);

      const updatedM2 = await db.module.findUnique({ where: { id: m2.id } });
      expect(updatedM2?.orderIndex).toBe(0);
    });
  });

  describe('3. Admin Lesson REST APIs & Reordering', () => {
    it('should create a new Lesson under module with YouTube URL parsing', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/modules/${testModuleId}/lessons`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Pelajaran Testing 1',
          slug: 'pelajaran-testing-1',
          youtubeVideoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          summaryContent: 'Ringkasan materi pelajaran testing',
          speakingPrompt: 'Practice prompt text',
          isPublished: true,
        }),
      });

      const res = await createAdminLesson(req, { params: { id: testModuleId } });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Pelajaran Testing 1');
      expect(json.data.youtubeVideoId).toBe('dQw4w9WgXcQ'); // Parsed to 11-char ID!

      testLessonId = json.data.id;
    });

    it('should reorder lessons via PUT /api/v1/admin/modules/[id]/lessons/reorder', async () => {
      const l2 = await db.lesson.create({
        data: {
          moduleId: testModuleId,
          title: 'Pelajaran Testing 2',
          slug: 'pelajaran-testing-2',
          youtubeVideoId: 'dQw4w9WgXcQ',
          orderIndex: 1,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/admin/modules/${testModuleId}/lessons/reorder`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          lessonIds: [l2.id, testLessonId],
        }),
      });

      const res = await reorderAdminLessons(req, { params: { id: testModuleId } });
      expect(res.status).toBe(200);

      const updatedL2 = await db.lesson.findUnique({ where: { id: l2.id } });
      expect(updatedL2?.orderIndex).toBe(0);

      // Clean up l2
      await db.lesson.delete({ where: { id: l2.id } });
    });
  });

  describe('4. Delete Dependency Protection (HTTP 400 Rules)', () => {
    it('should reject hard delete of Lesson with HTTP 400 if it has student progress', async () => {
      // 1. Create student progress for testLessonId
      await db.lessonProgress.create({
        data: {
          userId: studentUserId,
          lessonId: testLessonId,
          videoCompleted: true,
          isCompleted: false,
        },
      });

      // 2. Attempt lesson delete
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/lessons/${testLessonId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteAdminLesson(req, { params: { id: testLessonId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Tidak dapat menghapus pelajaran yang memiliki riwayat aktivitas siswa');

      // Clean up progress
      await db.lessonProgress.deleteMany({ where: { lessonId: testLessonId } });
    });

    it('should reject hard delete of Module with HTTP 400 if any child lesson has student progress', async () => {
      // 1. Create student progress for testLessonId
      await db.lessonProgress.create({
        data: {
          userId: studentUserId,
          lessonId: testLessonId,
          videoCompleted: true,
          isCompleted: true,
        },
      });

      // 2. Attempt module delete
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/modules/${testModuleId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteAdminModule(req, { params: { id: testModuleId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Tidak dapat menghapus modul yang memiliki riwayat aktivitas siswa');

      // Clean up progress
      await db.lessonProgress.deleteMany({ where: { lessonId: testLessonId } });
    });
  });

  describe('5. Student Visibility Cascade Hardening (Published-Only Rule)', () => {
    let draftLessonId: string;

    beforeAll(async () => {
      // Create a draft lesson in testModuleId
      const draftLes = await db.lesson.create({
        data: {
          moduleId: testModuleId,
          title: 'Draft Secret Lesson',
          slug: 'draft-secret-lesson',
          youtubeVideoId: 'dQw4w9WgXcQ',
          isPublished: false,
        },
      });
      draftLessonId = draftLes.id;
    });

    it('should exclude draft lessons from Student Course Service getCourseBySlug', async () => {
      const syllabus = await CourseService.getCourseBySlug('curriculum-test-course');
      const allLessonSlugs = syllabus.modules.flatMap((m) => m.lessons.map((l) => l.slug));

      expect(allLessonSlugs).toContain('pelajaran-testing-1');
      expect(allLessonSlugs).not.toContain('draft-secret-lesson');
    });

    it('should return HTTP 404 for direct access to draft lesson via getLessonBySlug', async () => {
      await expect(
        CourseService.getLessonBySlug('curriculum-test-course', 'draft-secret-lesson', studentUserId)
      ).rejects.toHaveProperty('status', 404);
    });

    it('should return HTTP 404 for direct access to draft lesson via GET /api/v1/lessons/[id]', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/lessons/${draftLessonId}`, {
        headers: { authorization: `Bearer ${studentToken}` },
      });

      const res = await getPublicLessonById(req, { params: { id: draftLessonId } });
      expect(res.status).toBe(404);
    });

    it('should return HTTP 404 for quiz access on draft lesson via GET /api/v1/courses/.../quiz', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/courses/curriculum-test-course/lessons/draft-secret-lesson/quiz',
        {
          headers: { authorization: `Bearer ${studentToken}` },
        }
      );

      const res = await getPublicQuizBySlug(req, {
        params: { slug: 'curriculum-test-course', lessonSlug: 'draft-secret-lesson' },
      });
      expect(res.status).toBe(404);
    });
  });
});
