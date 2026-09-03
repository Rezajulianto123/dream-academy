import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

describe('Phase 6 — BUILD-06.2.2 CMS Shell Layout & Navigation Foundation Tests', () => {
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    // 1. Setup Student User & Token
    const studentUser = await db.user.upsert({
      where: { email: 'shell_student@test.com' },
      update: { role: 'student' },
      create: {
        email: 'shell_student@test.com',
        passwordHash: await bcrypt.hash('StudentSecret123!', 10),
        fullName: 'Shell Student User',
        role: 'student',
      },
    });

    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    // 2. Setup Admin User & Token
    const adminUser = await db.user.upsert({
      where: { email: 'shell_admin@test.com' },
      update: { role: 'admin' },
      create: {
        email: 'shell_admin@test.com',
        passwordHash: await bcrypt.hash('AdminSecret123!', 10),
        fullName: 'Shell Admin User',
        role: 'admin',
      },
    });

    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });
  });

  describe('1. Middleware CMS Shell Route Guards', () => {
    it('should allow authenticated admin access to /cms dashboard shell (HTTP 200)', () => {
      const req = new NextRequest('http://localhost:3000/cms', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('should allow authenticated admin access to /cms/courses placeholder page (HTTP 200)', () => {
      const req = new NextRequest('http://localhost:3000/cms/courses', {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated access to /cms with HTTP 307 redirect to /cms/login', () => {
      const req = new NextRequest('http://localhost:3000/cms');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/cms/login');
    });

    it('should reject authenticated student access to /cms with HTTP 403 Forbidden', () => {
      const req = new NextRequest('http://localhost:3000/cms', {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
    });

    it('should reject authenticated student access to /cms/courses placeholder with HTTP 403 Forbidden', () => {
      const req = new NextRequest('http://localhost:3000/cms/courses', {
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });
      const res = middleware(req);
      expect(res.status).toBe(403);
    });
  });
});
