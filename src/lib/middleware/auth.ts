import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export function extractAuthToken(req: NextRequest): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Check auth_token cookie
  const tokenCookie = req.cookies.get('auth_token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

export function authenticate(req: NextRequest): TokenPayload | null {
  const token = extractAuthToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: NextRequest, allowedRoles?: ('student' | 'admin')[]) {
  const user = authenticate(req);

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autentikasi diperlukan untuk mengakses resource ini.',
            details: [],
          },
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Anda tidak memiliki hak akses untuk tindakan ini.',
            details: [],
          },
        },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
