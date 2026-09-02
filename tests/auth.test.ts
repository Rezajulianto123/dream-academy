import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';
import { signToken, verifyToken, getJwtSecret } from '@/lib/jwt';
import { registerSchema, loginSchema } from '@/lib/validations/auth';
import { extractAuthToken, requireAuth } from '@/lib/middleware/auth';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

describe('Password Security Utility', () => {
  it('should hash password with bcrypt salt and verify successfully', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash).not.toBe(rawPassword);

    const isMatch = await verifyPassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });
});

describe('JWT Security & Token Utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should sign and verify token correctly using HS256 algorithm', () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'student@example.com',
      role: 'student' as const,
    };

    const token = signToken(payload);
    expect(token).toBeDefined();

    // Verify header algorithm is HS256
    const decodedHeader = jwt.decode(token, { complete: true });
    expect(decodedHeader?.header.alg).toBe('HS256');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it('should reject tokens with expired duration', async () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'expired@example.com',
      role: 'student' as const,
    };

    // Sign with 1 second expiry
    const shortLivedToken = signToken(payload, '1ms');

    // Wait 10ms to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 10));

    const decoded = verifyToken(shortLivedToken);
    expect(decoded).toBeNull();
  });

  it('should reject tokens signed with different or forged secret', () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'forged@example.com',
      role: 'student' as const,
    };

    const forgedToken = jwt.sign(payload, 'attacker-secret-key-12345678901234', {
      algorithm: 'HS256',
    });

    const decoded = verifyToken(forgedToken);
    expect(decoded).toBeNull();
  });

  it('should reject unsigned ("none" algorithm) tokens', () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'attacker@example.com',
      role: 'admin' as const,
    };

    // Construct unsigned token manually
    const unsignedToken = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;

    const decoded = verifyToken(unsignedToken);
    expect(decoded).toBeNull();
  });

  it('should throw fatal error in production when JWT_SECRET is missing', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => getJwtSecret()).toThrowError(/FATAL: JWT_SECRET environment variable is missing/);
  });

  it('should use configured JWT_SECRET environment variable when provided', () => {
    process.env.JWT_SECRET = 'custom-configured-production-jwt-secret-min-32-chars';
    expect(getJwtSecret()).toBe('custom-configured-production-jwt-secret-min-32-chars');
  });
});

describe('Auth Validation Schemas', () => {
  it('should validate correct registration payload', () => {
    const validData = {
      full_name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'StrongPassword123',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email in registration', () => {
    const invalidData = {
      full_name: 'Budi Santoso',
      email: 'not-an-email',
      password: 'StrongPassword123',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject password without letters and numbers', () => {
    const invalidData = {
      full_name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'onlylettersnopassword',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject short password under 8 chars in registration', () => {
    const invalidData = {
      full_name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'Pass1',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate correct login payload', () => {
    const validData = {
      email: 'budi@example.com',
      password: 'AnyPassword123',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Auth Middleware & Guard Extraction', () => {
  it('should extract token from Authorization header Bearer format', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      headers: {
        authorization: 'Bearer mock-jwt-token-123',
      },
    });

    const token = extractAuthToken(req);
    expect(token).toBe('mock-jwt-token-123');
  });

  it('should extract token from auth_token cookie', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      headers: {
        cookie: 'auth_token=mock-cookie-token-456',
      },
    });

    const token = extractAuthToken(req);
    expect(token).toBe('mock-cookie-token-456');
  });

  it('should return null when no token is provided in request', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me');
    const token = extractAuthToken(req);
    expect(token).toBeNull();
  });

  it('should return 401 error response on requireAuth without token', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me');
    const { user, errorResponse } = requireAuth(req);

    expect(user).toBeNull();
    expect(errorResponse).not.toBeNull();
    expect(errorResponse?.status).toBe(401);

    const data = await errorResponse?.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should enforce role-based authorization in requireAuth', async () => {
    const studentToken = signToken({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'student@example.com',
      role: 'student',
    });

    const req = new NextRequest('http://localhost:3000/api/v1/admin/manage', {
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    const { user, errorResponse } = requireAuth(req, ['admin']);
    expect(user).toBeNull();
    expect(errorResponse?.status).toBe(403);

    const data = await errorResponse?.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });
});
