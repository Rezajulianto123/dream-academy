import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { POST as registerHandler } from '@/app/api/v1/auth/register/route';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';
import { GET as meHandler } from '@/app/api/v1/auth/me/route';
import { NextRequest } from 'next/server';

describe('Auth End-to-End Integration Flow', () => {
  const testEmail = `integration.test.${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testFullName = 'Integration Test User';
  let issuedToken = '';

  afterAll(async () => {
    // Cleanup created test user from database
    try {
      await db.user.deleteMany({
        where: { email: testEmail },
      });
    } catch (e) {
      // Ignore if DB connection not active in purely mocked context
    }
  });

  it('Step 1: Register -> DB persistence -> JWT issuance -> HttpOnly Cookie set', async () => {
    const registerReq = new NextRequest('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: testFullName,
        email: testEmail,
        password: testPassword,
      }),
    });

    const res = await registerHandler(registerReq);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(testEmail);
    expect(json.data.user.full_name).toBe(testFullName);
    expect(json.data.user.role).toBe('student');
    expect(json.data.token).toBeDefined();

    issuedToken = json.data.token;

    // Verify DB persistence
    const persistedUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    expect(persistedUser).not.toBeNull();
    expect(persistedUser?.fullName).toBe(testFullName);
    expect(persistedUser?.passwordHash.startsWith('$2')).toBe(true);

    // Verify Cookie set in response
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain('auth_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie?.toLowerCase()).toContain('samesite=lax');
  });

  it('Step 2: Reject duplicate registration with 409 Conflict', async () => {
    const duplicateReq = new NextRequest('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: testFullName,
        email: testEmail,
        password: testPassword,
      }),
    });

    const res = await duplicateReq.json().then(body => 
      registerHandler(new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }))
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('Step 3: Login with valid credentials -> returns token and sets cookie', async () => {
    const loginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const res = await loginHandler(loginReq);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('auth_token=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('Step 4: Reject login with invalid password with 401 Unauthorized', async () => {
    const invalidLoginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword999!',
      }),
    });

    const res = await loginHandler(invalidLoginReq);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('Step 5: Access protected GET /api/v1/auth/me using auth_token cookie', async () => {
    const meReq = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'GET',
      headers: {
        cookie: `auth_token=${issuedToken}`,
      },
    });

    const res = await meHandler(meReq);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testEmail);
    expect(json.data.full_name).toBe(testFullName);
    expect(json.data.role).toBe('student');
  });

  it('Step 6: Access protected GET /api/v1/auth/me using Bearer Authorization Header', async () => {
    const meReq = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${issuedToken}`,
      },
    });

    const res = await meHandler(meReq);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe(testEmail);
  });

  it('Step 7: Reject GET /api/v1/auth/me when unauthenticated (no token)', async () => {
    const meReq = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'GET',
    });

    const res = await meHandler(meReq);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('Step 8: Logout -> clears auth_token cookie with Max-Age=0', async () => {
    const res = await logoutHandler();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.message).toBe('Logout berhasil.');

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain('auth_token=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
  });
});
