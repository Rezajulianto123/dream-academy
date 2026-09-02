import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { db } from '@/lib/db';
import { QuizService } from '@/services/quiz.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; lessonSlug: string } }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body harus berupa JSON yang valid.',
          details: [],
        },
      },
      { status: 400 }
    );
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
      include: {
        quiz: {
          select: { id: true },
        },
      },
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

    if (!lesson.quiz) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUIZ_NOT_FOUND',
            message: 'Kuis untuk lesson ini tidak ditemukan.',
            details: [],
          },
        },
        { status: 404 }
      );
    }

    const result = await QuizService.submitQuiz(
      user!.userId,
      lesson.quiz.id,
      body
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Terjadi kesalahan saat mengevaluasi kuis.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
