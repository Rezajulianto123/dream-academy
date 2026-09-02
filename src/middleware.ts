import { NextRequest, NextResponse } from 'next/server';
import { extractAuthToken, authenticate } from '@/lib/middleware/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Protection for Admin API Routes (/api/v1/admin/*)
  if (pathname.startsWith('/api/v1/admin')) {
    const token = extractAuthToken(req);
    const user = authenticate(req);

    if (!token || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Autentikasi diperlukan untuk mengakses resource ini.',
            details: [],
          },
        },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Anda tidak memiliki hak akses untuk tindakan ini.',
            details: [],
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // 2. Protection for CMS Browser Routes (/cms/*)
  if (pathname.startsWith('/cms')) {
    // Allow public access to /cms/login
    if (pathname === '/cms/login') {
      return NextResponse.next();
    }

    const token = extractAuthToken(req);
    const user = authenticate(req);

    // Unauthenticated -> Redirect to /cms/login (302)
    if (!token || !user) {
      const loginUrl = new URL('/cms/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated non-admin (Student) -> HTTP 403 Forbidden
    if (user.role !== 'admin') {
      return new NextResponse('Forbidden: Access Denied for Student Role', {
        status: 403,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    // Authenticated Admin -> Allow
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cms/:path*', '/api/v1/admin/:path*'],
};
