import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';
import { signToken, verifyToken } from '@/lib/jwt';
import { registerSchema, loginSchema } from '@/lib/validations/auth';
import { extractAuthToken } from '@/lib/middleware/auth';
import { NextRequest } from 'next/server';

describe('Password Utility', () => {
  it('should hash password and verify successfully', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);

    const isMatch = await verifyPassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword('WrongPassword123!', hash);
    expect(isWrongMatch).toBe(false);
  });
});

describe('JWT Token Utility', () => {
  it('should sign and verify token correctly', () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'student' as const,
    };

    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid.token.payload');
    expect(decoded).toBeNull();
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

  it('should reject short password in registration', () => {
    const invalidData = {
      full_name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'short',
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

describe('Auth Middleware Extraction', () => {
  it('should extract token from Authorization header', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      headers: {
        authorization: 'Bearer mock-jwt-token-123',
      },
    });

    const token = extractAuthToken(req);
    expect(token).toBe('mock-jwt-token-123');
  });

  it('should return null when no token is provided', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me');
    const token = extractAuthToken(req);
    expect(token).toBeNull();
  });
});
