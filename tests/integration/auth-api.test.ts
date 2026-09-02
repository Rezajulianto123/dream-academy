import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "@/app/api/v1/auth/register/route";
import { POST as loginHandler } from "@/app/api/v1/auth/login/route";
import { GET as meHandler } from "@/app/api/v1/auth/me/route";
import { POST as logoutHandler } from "@/app/api/v1/auth/logout/route";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

describe("Authentication API Routes Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should return 400 when input validation fails (e.g., short password)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: "A",
          email: "not-an-email",
          password: "short",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.length).toBeGreaterThan(0);
    });

    it("should register successfully and set HttpOnly auth cookie", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.user, "create").mockResolvedValue({
        id: "mock-user-id",
        full_name: "Test User",
        email: "test@example.com",
        role: "student",
        created_at: new Date(),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: "Test User",
          email: "test@example.com",
          password: "SecurePassword123!",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe("test@example.com");
      expect(json.data.token).toBeDefined();

      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toContain(AUTH_COOKIE_NAME);
      expect(cookieHeader).toContain("HttpOnly");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should return 401 when invalid credentials are provided", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wrong@example.com",
          password: "WrongPassword123!",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("should return 200 and set cookie on valid credentials", async () => {
      const passwordHash = await hashPassword("CorrectPassword123!");
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "valid-user-id",
        full_name: "Valid User",
        email: "valid@example.com",
        password_hash: passwordHash,
        role: "student",
        created_at: new Date(),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "valid@example.com",
          password: "CorrectPassword123!",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe("valid@example.com");
      expect(json.data.token).toBeDefined();

      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toContain(AUTH_COOKIE_NAME);
      expect(cookieHeader).toContain("HttpOnly");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should return 401 UNAUTHORIZED when no token is supplied", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        method: "GET",
      });

      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 200 and user profile when Bearer token is provided", async () => {
      const token = signToken({
        userId: "auth-user-id",
        email: "auth@example.com",
        role: "student",
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "auth-user-id",
        full_name: "Authenticated User",
        email: "auth@example.com",
        role: "student",
        created_at: new Date(),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("auth-user-id");
      expect(json.data.email).toBe("auth@example.com");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should return 200 and clear the auth cookie", async () => {
      const res = await logoutHandler();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const cookieHeader = res.headers.get("set-cookie");
      expect(cookieHeader).toContain(AUTH_COOKIE_NAME);
      expect(cookieHeader).toContain("Max-Age=0");
    });
  });
});
