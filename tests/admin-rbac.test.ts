import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { signToken, verifyToken } from '@/lib/jwt';
import { middleware } from '@/middleware';
import { GET as adminHealthRoute } from '@/app/api/v1/admin/health/route';
import { runAdminSeed } from '@/../prisma/seed-admin';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

describe('Phase 6 — BUILD-06.1 Core Admin RBAC Guard & Authorization Matrix Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let studentUser: any;
  let studentToken: string;

  beforeAll(async () => {
    // 1. Setup Student User
    studentUser = await db.user.upsert({
      where: { email: 'rbac_student@test.com' },
      update: { role: 'student' },
      create: {
        email: 'rbac_student@test.com',
        passwordHash: await bcrypt.hash('Student123!', 10),
        fullName: 'RBAC Student',
        role: 'student',
      },
    });

    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    // 2. Setup Admin User
    adminUser = await db.user.upsert({
      where: { email: 'rbac_admin@test.com' },
      update: { role: 'admin' },
      create: {
        email: 'rbac_admin@test.com',
        passwordHash: await bcrypt.hash('Admin123!', 10),
        fullName: 'RBAC Admin',
        role: 'admin',
      },
    });

    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });
  });

  describe('1. Phase 1 JWT Reuse & Role Verification', () => {
    it('should encode and decode admin role cleanly in JWT payload', () => {
      const decoded = verifyToken(adminToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(adminUser.id);
      expect(decoded?.role).toBe('admin');
    });

    it('should encode and decode student role cleanly in JWT payload', () => {
      const decoded = verifyToken(studentToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(studentUser.id);
      expect(decoded?.role).toBe('student');
    });
  });

  describe('2. CMS Browser Route Protection Matrix (/cms/*)', () => {
    it('should allow public access to /cms/login', () => {
      const req = new NextRequest('http://localhost:3000/cms/login');
      const res = middleware(req);
      expect(res.status).toBe(200); // NextResponse.next()
    });

    it('should redirect unauthenticated browser request on /cms/dashboard to /cms/login (302)', () => {
      const req = new NextRequest('http://localhost:3000/cms/dashboard');
      const res = middleware(req);
      expect(res.status).toBe(307); // Next.js redirect status
      expect(res.headers.get('location')).toBe('http://localhost:3000/cms/login');
    });

    it('should deny authenticated student browser request on /cms/dashboard with 403', () => {
      const req = new NextRequest('http://localhost:3000/cms/dashboard', {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
    });

    it('should allow authenticated admin browser request on /cms/dashboard', () => {
      const req = new NextRequest('http://localhost:3000/cms/dashboard', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });

  describe('3. Admin API Route Protection Matrix (/api/v1/admin/*)', () => {
    it('should reject unauthenticated API request to /api/v1/admin/health with 401 UNAUTHORIZED', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/health');
      const middlewareRes = middleware(req);
      expect(middlewareRes.status).toBe(401);
      const json = await middlewareRes.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject authenticated student API request to /api/v1/admin/health with 403 FORBIDDEN', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/health', {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });
      const middlewareRes = middleware(req);
      expect(middlewareRes.status).toBe(403);
      const json = await middlewareRes.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('should allow authenticated admin API request to /api/v1/admin/health with 200 OK', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/health', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      const res = await adminHealthRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.admin.role).toBe('admin');
    });

    it('should support auth_token cookie for authenticated admin API requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/health', {
        headers: {
          cookie: `auth_token=${adminToken}`,
        },
      });
      const res = await adminHealthRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.admin.email).toBe(adminUser.email);
    });
  });

  describe('4. Hardened Admin Seed Security (npm run seed:admin)', () => {
    const originalEmail = process.env.ADMIN_EMAIL;
    const originalPassword = process.env.ADMIN_PASSWORD;

    afterEach(() => {
      process.env.ADMIN_EMAIL = originalEmail;
      process.env.ADMIN_PASSWORD = originalPassword;
    });

    it('A. ADMIN_EMAIL missing -> provisioning fails (throws error)', async () => {
      delete process.env.ADMIN_EMAIL;
      process.env.ADMIN_PASSWORD = 'SomePassword123!';

      await expect(runAdminSeed()).rejects.toThrow(
        'FATAL: ADMIN_EMAIL environment variable is required'
      );
    });

    it('B. ADMIN_PASSWORD missing -> provisioning fails (throws error)', async () => {
      process.env.ADMIN_EMAIL = 'new_admin@test.com';
      delete process.env.ADMIN_PASSWORD;

      await expect(runAdminSeed()).rejects.toThrow(
        'FATAL: ADMIN_PASSWORD environment variable is required'
      );
    });

    it('C. New admin created when env vars provided', async () => {
      const testEmail = `seed_test_${Date.now()}@test.com`;
      const testPassword = 'Password123!';
      process.env.ADMIN_EMAIL = testEmail;
      process.env.ADMIN_PASSWORD = testPassword;

      const createdAdmin = await runAdminSeed();
      expect(createdAdmin.email).toBe(testEmail);
      expect(createdAdmin.role).toBe('admin');

      const isPasswordValid = await bcrypt.compare(testPassword, createdAdmin.passwordHash);
      expect(isPasswordValid).toBe(true);

      // Cleanup
      await db.user.delete({ where: { id: createdAdmin.id } });
    });

    it('D & E. Re-running provisioning does not create duplicate and keeps existing password', async () => {
      const testEmail = `seed_existing_${Date.now()}@test.com`;
      const initialPassword = 'InitialSecret123!';
      
      const originalUser = await db.user.create({
        data: {
          email: testEmail,
          passwordHash: await bcrypt.hash(initialPassword, 10),
          fullName: 'Original User',
          role: 'student',
        },
      });

      process.env.ADMIN_EMAIL = testEmail;
      process.env.ADMIN_PASSWORD = 'DifferentPassword456!';

      // Run seed:admin on existing user
      const seededUser = await runAdminSeed();
      expect(seededUser.id).toBe(originalUser.id);
      expect(seededUser.role).toBe('admin');

      // Verify existing password was NOT overwritten with DifferentPassword456!
      const isInitialPasswordStillValid = await bcrypt.compare(initialPassword, seededUser.passwordHash);
      expect(isInitialPasswordStillValid).toBe(true);

      const isNewPasswordValid = await bcrypt.compare('DifferentPassword456!', seededUser.passwordHash);
      expect(isNewPasswordValid).toBe(false);

      // Cleanup
      await db.user.delete({ where: { id: originalUser.id } });
    });
  });

  describe('5. Database Migration Schema Default Tests (Blocker 2 Fix)', () => {
    it('F & G. should ensure newly created Module and Lesson default to isPublished = true without passing it explicitly', async () => {
      const course = await db.course.create({
        data: {
          title: 'Schema Test Course',
          slug: `schema-test-course-${Date.now()}`,
          isPublished: true,
        },
      });

      // Module created WITHOUT supplying isPublished
      const module = await db.module.create({
        data: {
          courseId: course.id,
          title: 'Schema Test Module',
          slug: 'schema-test-module',
        },
      });

      // Lesson created WITHOUT supplying isPublished
      const lesson = await db.lesson.create({
        data: {
          moduleId: module.id,
          title: 'Schema Test Lesson',
          slug: 'schema-test-lesson',
          youtubeVideoId: 'dQw4w9WgXcQ',
        },
      });

      // Assert database / schema defaults
      expect(module.isPublished).toBe(true);
      expect(lesson.isPublished).toBe(true);

      // Cleanup
      await db.course.delete({ where: { id: course.id } });
    });
  });
});
