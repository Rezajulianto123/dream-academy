import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { middleware } from '@/middleware';
import { POST as loginRoute } from '@/app/api/v1/auth/login/route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

describe('Phase 6 — BUILD-06.2.1 CMS Login Interface & Auth Integration Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let studentUser: any;
  let studentToken: string;

  beforeAll(async () => {
    // 1. Setup Student User
    studentUser = await db.user.upsert({
      where: { email: 'cms_student@test.com' },
      update: { role: 'student' },
      create: {
        email: 'cms_student@test.com',
        passwordHash: await bcrypt.hash('StudentSecret123!', 10),
        fullName: 'CMS Student User',
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
      where: { email: 'cms_admin@test.com' },
      update: { role: 'admin' },
      create: {
        email: 'cms_admin@test.com',
        passwordHash: await bcrypt.hash('AdminSecret123!', 10),
        fullName: 'CMS Admin User',
        role: 'admin',
      },
    });

    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });
  });

  describe('1. Admin Authentication API (POST /api/v1/auth/login)', () => {
    it('1. Admin login success -> Returns 200, user data with role admin, and sets auth_token cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cms_admin@test.com',
          password: 'AdminSecret123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.role).toBe('admin');
      expect(json.data.user.email).toBe('cms_admin@test.com');
      expect(json.data.token).toBeDefined();

      const cookieHeader = res.headers.get('set-cookie');
      expect(cookieHeader).toContain('auth_token=');
    });

    it('2. Invalid password -> Returns HTTP 401 with generic/standard auth error', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cms_admin@test.com',
          password: 'WrongPassword999!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('3. Unknown email -> Returns HTTP 401 with generic/standard auth error', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent_admin@test.com',
          password: 'AdminSecret123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('4. Malformed input (invalid email format) -> Returns HTTP 400 validation error', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'AdminSecret123!',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('5. Missing fields (empty password) -> Returns HTTP 400 validation error', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cms_admin@test.com',
          password: '',
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. CMS Middleware Authorization Matrix (/cms/*)', () => {
    it('6. Authenticated admin accessing /cms/login -> HTTP 307 Redirect to /cms', () => {
      const req = new NextRequest('http://localhost:3000/cms/login', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/cms');
    });

    it('7. Student attempting CMS access (/cms/dashboard) -> HTTP 403 Forbidden', () => {
      const req = new NextRequest('http://localhost:3000/cms/dashboard', {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
    });

    it('8. Unauthenticated protected CMS access (/cms/dashboard) -> HTTP 307 Redirect to /cms/login', () => {
      const req = new NextRequest('http://localhost:3000/cms/dashboard');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/cms/login');
    });

    it('9. Successful redirect to /cms (Authenticated admin on /cms -> HTTP 200 Allowed)', () => {
      const req = new NextRequest('http://localhost:3000/cms', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });
});
