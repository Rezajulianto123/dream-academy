import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { AuthService } from '@/services/auth.service';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const profile = await AuthService.getProfile(user!.userId);

    return NextResponse.json(
      {
        success: true,
        data: profile,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const status = error.status || 500;
    const code = error.code || 'INTERNAL_SERVER_ERROR';

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message: error.message || 'Terjadi kesalahan pada server',
          details: [],
        },
      },
      { status }
    );
  }
}
