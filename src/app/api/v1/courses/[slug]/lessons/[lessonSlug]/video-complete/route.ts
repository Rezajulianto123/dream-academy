import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { ProgressService } from '@/services/progress.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; lessonSlug: string } }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  let telemetry: { playback_seconds?: number } = {};
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.playback_seconds === 'number') {
      telemetry.playback_seconds = body.playback_seconds;
    }
  } catch {
    // optional payload
  }

  try {
    const lesson = await db.lesson.findFirst({
      where: {
        slug: params.lessonSlug,
        module: {
          course: {
            slug: params.slug,
          },
        },
      },
      select: { id: true },
    });

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

    const result = await ProgressService.markVideoCompleted(
      user!.userId,
      lesson.id,
      telemetry
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
          message: error.message || 'Terjadi kesalahan saat menyimpan status video.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
