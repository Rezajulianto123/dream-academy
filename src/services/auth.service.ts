import prisma from "@/lib/db";
import { hashPassword, comparePassword } from "@/lib/password";
import { signToken, verifyToken } from "@/lib/jwt";
import { RegisterInput, LoginInput } from "@/schemas/auth.schema";
import { AuthResponseData, UserSafe, JwtPayload } from "@/types/auth";

export class AuthError extends Error {
  code: string;
  statusCode: number;
  details?: unknown[];

  constructor(message: string, code: string, statusCode = 400, details: unknown[] = []) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthService {
  static async register(input: RegisterInput): Promise<AuthResponseData> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new AuthError(
        "Email sudah terdaftar. Silakan gunakan email lain atau login.",
        "EMAIL_ALREADY_EXISTS",
        409
      );
    }

    const password_hash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        full_name: input.full_name,
        email: input.email.toLowerCase(),
        password_hash,
        role: "student",
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    };
  }

  static async login(input: LoginInput): Promise<AuthResponseData> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new AuthError(
        "Email atau password yang Anda masukkan salah.",
        "INVALID_CREDENTIALS",
        401
      );
    }

    const isPasswordValid = await comparePassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthError(
        "Email atau password yang Anda masukkan salah.",
        "INVALID_CREDENTIALS",
        401
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    };
  }

  static async getUserById(userId: string): Promise<UserSafe | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });

    return user;
  }

  static authenticateRequest(
    authHeader?: string | null,
    cookieToken?: string | null
  ): JwtPayload {
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (cookieToken) {
      token = cookieToken.trim();
    }

    if (!token) {
      throw new AuthError(
        "Akses ditolak. Token autentikasi tidak ditemukan.",
        "UNAUTHORIZED",
        401
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      throw new AuthError(
        "Token autentikasi tidak valid atau telah kedaluwarsa.",
        "INVALID_TOKEN",
        401
      );
    }

    return payload;
  }
}
