import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { QuizService } from '@/services/quiz.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const result = await QuizService.submitQuiz(user!.userId, params.id, body);
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
