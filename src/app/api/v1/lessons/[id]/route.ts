import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { CourseService } from '@/services/course.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const lessonMeta = await db.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (
      !lessonMeta ||
      !lessonMeta.isPublished ||
      !lessonMeta.module.isPublished ||
      !lessonMeta.module.course.isPublished
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LESSON_NOT_FOUND',
            message: 'Lesson tidak ditemukan.',
            details: [],
          },
        },
        { status: 404 }
      );
    }

    const lessonData = await CourseService.getLessonBySlug(
      lessonMeta.module.course.slug,
      lessonMeta.slug,
      user!.userId
    );

    return NextResponse.json(
      {
        success: true,
        data: lessonData,
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
