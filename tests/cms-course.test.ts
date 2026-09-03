import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { GET as getAdminCourses, POST as createAdminCourse } from '@/app/api/v1/admin/courses/route';
import {
  GET as getAdminCourseDetail,
  PUT as updateAdminCourse,
  DELETE as deleteAdminCourse,
} from '@/app/api/v1/admin/courses/[id]/route';
import { GET as getPublicCourses } from '@/app/api/v1/courses/route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

describe('Phase 6 — BUILD-06.3 Course Management Foundation Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let studentUserId: string;

  beforeAll(async () => {
    // Clean up any old test courses with matching slugs if left over
    await db.course.deleteMany({
      where: {
        slug: {
          in: [
            'kursus-testing-draft',
            'kursus-testing-duplikat',
            'kursus-dengan-siswa-terdaftar',
            'draft-course-secret',
            'published-course-public',
          ],
        },
      },
    });

    // 1. Setup Student
    const studentUser = await db.user.upsert({
      where: { email: 'course_student@test.com' },
      update: { role: 'student' },
      create: {
        email: 'course_student@test.com',
        passwordHash: await bcrypt.hash('StudentSecret123!', 10),
        fullName: 'Course Student User',
        role: 'student',
      },
    });

    studentUserId = studentUser.id;
    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    // 2. Setup Admin
    const adminUser = await db.user.upsert({
      where: { email: 'course_admin@test.com' },
      update: { role: 'admin' },
      create: {
        email: 'course_admin@test.com',
        passwordHash: await bcrypt.hash('AdminSecret123!', 10),
        fullName: 'Course Admin User',
        role: 'admin',
      },
    });

    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });
  });

  afterAll(async () => {
    await db.course.deleteMany({
      where: {
        slug: {
          in: [
            'kursus-testing-draft',
            'kursus-testing-duplikat',
            'kursus-dengan-siswa-terdaftar',
            'draft-course-secret',
            'published-course-public',
          ],
        },
      },
    });
  });

  describe('1. Admin API Authorization Matrix', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/courses');
      const res = await getAdminCourses(req);
      expect(res.status).toBe(401);
    });

    it('should reject student request with HTTP 403 Forbidden', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/courses', {
        headers: { authorization: `Bearer ${studentToken}` },
      });
      const res = await getAdminCourses(req);
      expect(res.status).toBe(403);
    });

    it('should allow admin request with HTTP 200 OK', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/courses', {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const res = await getAdminCourses(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe('2. Course CRUD Operations & Business Logic', () => {
    let createdCourseId: string;
    let enrolledCourseId: string;

    it('should create a new Draft course via POST /api/v1/admin/courses', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/courses', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Kursus Testing Draft',
          slug: 'kursus-testing-draft',
          description: 'Deskripsi singkat kursus testing draft',
          isPublished: false,
        }),
      });

      const res = await createAdminCourse(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Kursus Testing Draft');
      expect(json.data.isPublished).toBe(false);

      createdCourseId = json.data.id;
    });

    it('should reject duplicate slug creation with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/courses', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Kursus Testing Duplikat',
          slug: 'kursus-testing-draft', // Duplicate slug
          description: 'Deskripsi',
        }),
      });

      const res = await createAdminCourse(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Slug sudah digunakan');
    });

    it('should update course title & toggle isPublished to true', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/admin/courses/${createdCourseId}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${adminToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Kursus Testing (Published Updated)',
            isPublished: true,
          }),
        }
      );

      const res = await updateAdminCourse(req, { params: { id: createdCourseId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Kursus Testing (Published Updated)');
      expect(json.data.isPublished).toBe(true);
    });

    it('should delete course with 0 enrollments', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/admin/courses/${createdCourseId}`,
        {
          method: 'DELETE',
          headers: { authorization: `Bearer ${adminToken}` },
        }
      );

      const res = await deleteAdminCourse(req, { params: { id: createdCourseId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify DB delete
      const deleted = await db.course.findUnique({ where: { id: createdCourseId } });
      expect(deleted).toBeNull();
    });

    it('should reject hard delete with HTTP 400 if course has active enrollments', async () => {
      // 1. Create a course with enrollment
      const enrolledCourse = await db.course.create({
        data: {
          title: 'Kursus Dengan Siswa Terdaftar',
          slug: 'kursus-dengan-siswa-terdaftar',
          isPublished: true,
          enrollments: {
            create: {
              userId: studentUserId,
            },
          },
        },
      });

      enrolledCourseId = enrolledCourse.id;

      // 2. Attempt delete
      const req = new NextRequest(
        `http://localhost:3000/api/v1/admin/courses/${enrolledCourseId}`,
        {
          method: 'DELETE',
          headers: { authorization: `Bearer ${adminToken}` },
        }
      );

      const res = await deleteAdminCourse(req, { params: { id: enrolledCourseId } });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Tidak dapat menghapus kursus yang memiliki siswa terdaftar');

      // Clean up test enrollment & course
      await db.enrollment.deleteMany({ where: { courseId: enrolledCourseId } });
      await db.course.delete({ where: { id: enrolledCourseId } });
    });
  });

  describe('3. Student App Catalog Visibility Isolation', () => {
    let draftCourseId: string;
    let publishedCourseId: string;

    beforeAll(async () => {
      const draft = await db.course.upsert({
        where: { slug: 'draft-course-secret' },
        update: { isPublished: false },
        create: {
          title: 'Draft Course Secret',
          slug: 'draft-course-secret',
          isPublished: false,
        },
      });
      draftCourseId = draft.id;

      const pub = await db.course.upsert({
        where: { slug: 'published-course-public' },
        update: { isPublished: true },
        create: {
          title: 'Published Course Public',
          slug: 'published-course-public',
          isPublished: true,
        },
      });
      publishedCourseId = pub.id;
    });

    it('should exclude Draft courses from public Student App API (GET /api/v1/courses)', async () => {
      const res = await getPublicCourses();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      const slugs = json.data.map((c: any) => c.slug);
      expect(slugs).toContain('published-course-public');
      expect(slugs).not.toContain('draft-course-secret');
    });

    it('should include both Draft & Published courses in Admin API (GET /api/v1/admin/courses)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/courses', {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const res = await getAdminCourses(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      const slugs = json.data.map((c: any) => c.slug);
      expect(slugs).toContain('published-course-public');
      expect(slugs).toContain('draft-course-secret');
    });
  });
});
