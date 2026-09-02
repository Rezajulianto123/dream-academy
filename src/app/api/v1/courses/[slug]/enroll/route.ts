import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { EnrollmentService } from '@/services/enrollment.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const course = await db.course.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Kursus tidak ditemukan.',
            details: [],
          },
        },
        { status: 404 }
      );
    }

    const enrollment = await EnrollmentService.autoEnroll(user!.userId, course.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          enrollment_id: enrollment.id,
          course_id: enrollment.courseId,
          enrolled_at: enrollment.enrolledAt,
          is_active: enrollment.isActive,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Terjadi kesalahan saat mendaftarkan kursus.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
