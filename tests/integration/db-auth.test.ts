import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db";
import { AuthService, AuthError } from "@/services/auth.service";

describe("Database & AuthService Real PostgreSQL Integration", () => {
  const testEmail = `test_${Date.now()}@example.com`;
  let createdUserId = "";

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });
    }
    await prisma.$disconnect();
  });

  it("should create user in PostgreSQL database with encrypted password hash", async () => {
    const res = await AuthService.register({
      full_name: "Test E2E User",
      email: testEmail,
      password: "SuperSecretPassword123!",
    });

    expect(res.user.id).toBeDefined();
    expect(res.user.email).toBe(testEmail);
    expect(res.user.role).toBe("student");
    expect(res.token).toBeDefined();

    createdUserId = res.user.id;

    // Verify in database directly
    const userInDb = await prisma.user.findUnique({
      where: { id: createdUserId },
    });

    expect(userInDb).not.toBeNull();
    expect(userInDb?.email).toBe(testEmail);
    expect(userInDb?.password_hash).not.toBe("SuperSecretPassword123!");
    expect(userInDb?.password_hash.startsWith("$2")).toBe(true);
  });

  it("should authenticate the created user successfully", async () => {
    const res = await AuthService.login({
      email: testEmail,
      password: "SuperSecretPassword123!",
    });

    expect(res.user.id).toBe(createdUserId);
    expect(res.user.email).toBe(testEmail);
    expect(res.token).toBeDefined();
  });

  it("should fail authentication on wrong password", async () => {
    await expect(
      AuthService.login({
        email: testEmail,
        password: "IncorrectPassword456!",
      })
    ).rejects.toThrow(AuthError);
  });

  it("should reject duplicate email in database", async () => {
    await expect(
      AuthService.register({
        full_name: "Duplicate User",
        email: testEmail,
        password: "SuperSecretPassword123!",
      })
    ).rejects.toThrow(AuthError);
  });
});
