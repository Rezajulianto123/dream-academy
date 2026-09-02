import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    data: {
      message: 'Admin RBAC Guard Active',
      admin: {
        id: user?.userId,
        email: user?.email,
        role: user?.role,
      },
    },
  });
}
