import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const CreateOptionSchema = z.object({
  optionText: z.string().min(1, 'Teks pilihan jawaban tidak boleh kosong'),
  isCorrect: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const questionId = params.id;
    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Soal kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = CreateOptionSchema.parse(body);

    const nextOrderIndex = question.options.length;

    if (validated.isCorrect) {
      await db.quizOption.updateMany({
        where: { questionId },
        data: { isCorrect: false },
      });
    }

    const option = await db.quizOption.create({
      data: {
        questionId,
        optionText: validated.optionText,
        isCorrect: validated.isCorrect,
        orderIndex: nextOrderIndex,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: option,
        message: 'Pilihan jawaban berhasil ditambahkan',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating option:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menambahkan pilihan jawaban' },
      { status: 500 }
    );
  }
}
