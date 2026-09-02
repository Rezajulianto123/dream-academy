import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { ProgressService } from '@/services/progress.service';
import { videoCompleteSchema } from '@/lib/validations/progress';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; lessonSlug: string } }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    let body: any = {};
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_JSON',
              message: 'Format request body tidak valid (JSON malformed).',
              details: [],
            },
          },
          { status: 400 }
        );
      }
    }

    const validationResult = videoCompleteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Data telemetry tidak valid.',
            details: validationResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const course = await db.course.findUnique({
      where: { slug: params.slug },
      include: {
        modules: {
          include: {
            lessons: {
              where: { slug: params.lessonSlug },
            },
          },
        },
      },
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

    const lesson = course.modules
      .flatMap((m) => m.lessons)
      .find((l) => l.slug === params.lessonSlug);

    if (!lesson) {
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

    const result = await ProgressService.markVideoComplete(
      user!.userId,
      lesson.id,
      validationResult.data
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Terjadi kesalahan saat mencatat pemutaran video.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
