import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { CourseService } from '@/services/course.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; lessonSlug: string } }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const lesson = await CourseService.getLessonBySlug(
      params.slug,
      params.lessonSlug,
      user!.userId
    );

    return NextResponse.json(
      {
        success: true,
        data: lesson,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Terjadi kesalahan saat memuat materi lesson.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
