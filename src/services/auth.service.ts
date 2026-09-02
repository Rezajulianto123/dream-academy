import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { signToken, TokenPayload } from '@/lib/jwt';
import { RegisterInput, LoginInput } from '@/lib/validations/auth';

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await db.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      const error: any = new Error('Email sudah terdaftar dalam sistem.');
      error.code = 'EMAIL_ALREADY_EXISTS';
      error.status = 409;
      throw error;
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await db.user.create({
      data: {
        email: input.email,
        fullName: input.full_name,
        passwordHash,
        role: 'student',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as 'student' | 'admin',
    });

    return {
      user: {
        id: newUser.id,
        full_name: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.createdAt,
      },
      token,
    };
  }

  static async login(input: LoginInput) {
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      const error: any = new Error('Email atau password tidak valid.');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      const error: any = new Error('Email atau password tidak valid.');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'student' | 'admin',
    });

    return {
      user: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        role: user.role,
        created_at: user.createdAt,
      },
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      const error: any = new Error('Pengguna tidak ditemukan.');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
    };
  }
}
