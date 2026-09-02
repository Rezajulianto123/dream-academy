import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService, AuthError } from "@/services/auth.service";
import prisma from "@/lib/db";
import { hashPassword, comparePassword } from "@/lib/password";
import { signToken, verifyToken } from "@/lib/jwt";

describe("Password Hashing & Verification", () => {
  it("should securely hash a password and verify matching password", async () => {
    const raw = "SecurePass123!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.length).toBeGreaterThan(20);

    const isMatch = await comparePassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword("WrongPass456!", hash);
    expect(isWrongMatch).toBe(false);
  });
});

describe("JWT Token Creation & Verification", () => {
  it("should sign and verify valid JWT token", () => {
    const payload = {
      userId: "11111111-1111-1111-1111-111111111111",
      email: "test@example.com",
      role: "student",
    };

    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it("should return null for invalid token", () => {
    const decoded = verifyToken("invalid.token.payload");
    expect(decoded).toBeNull();
  });
});

describe("AuthService Unit Tests", () => {
  const testUser = {
    id: "user-uuid-12345",
    email: "reza@example.com",
    password_hash: "$2a$12$eXampleHashedPasswordString",
    full_name: "Reza Julianto",
    role: "student",
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw error if email is already registered", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(testUser as any);

    await expect(
      AuthService.register({
        full_name: "New Student",
        email: "reza@example.com",
        password: "Password123!",
      })
    ).rejects.toThrow(AuthError);
  });

  it("should successfully register a new user and return token", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.user, "create").mockResolvedValue({
      id: "new-user-id",
      full_name: "New Student",
      email: "new@example.com",
      role: "student",
      created_at: new Date(),
    } as any);

    const result = await AuthService.register({
      full_name: "New Student",
      email: "new@example.com",
      password: "Password123!",
    });

    expect(result.user.email).toBe("new@example.com");
    expect(result.user.role).toBe("student");
    expect(result.token).toBeDefined();
  });

  it("should reject login when user does not exist", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

    await expect(
      AuthService.login({
        email: "nonexistent@example.com",
        password: "Password123!",
      })
    ).rejects.toThrow(AuthError);
  });

  it("should authenticate request via Bearer header", () => {
    const token = signToken({
      userId: "test-user-id",
      email: "auth@example.com",
      role: "student",
    });

    const payload = AuthService.authenticateRequest(`Bearer ${token}`);
    expect(payload.userId).toBe("test-user-id");
    expect(payload.email).toBe("auth@example.com");
  });

  it("should authenticate request via Cookie token", () => {
    const token = signToken({
      userId: "cookie-user-id",
      email: "cookie@example.com",
      role: "student",
    });

    const payload = AuthService.authenticateRequest(null, token);
    expect(payload.userId).toBe("cookie-user-id");
  });

  it("should throw 401 UNAUTHORIZED when no token is provided", () => {
    expect(() => AuthService.authenticateRequest(null, null)).toThrow(AuthError);
  });
});
