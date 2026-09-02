import { NextRequest, NextResponse } from 'next/server';
import { CourseService } from '@/services/course.service';
import { authenticate } from '@/lib/middleware/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = authenticate(req);
    const course = await CourseService.getCourseBySlug(params.slug, user?.userId);

    return NextResponse.json(
      {
        success: true,
        data: course,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Terjadi kesalahan saat memuat detail kursus.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
