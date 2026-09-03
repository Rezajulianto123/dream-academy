import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const ReorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const quizId = params.id;
    const body = await req.json();
    const validated = ReorderQuestionsSchema.parse(body);

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.$transaction(
      validated.questionIds.map((questionId, index) =>
        db.quizQuestion.update({
          where: { id: questionId },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Urutan soal kuis berhasil diperbarui',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error reordering questions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui urutan soal' },
      { status: 500 }
    );
  }
}
