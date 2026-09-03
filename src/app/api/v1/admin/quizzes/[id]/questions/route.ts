import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const OptionInputSchema = z.object({
  optionText: z.string().min(1, 'Teks pilihan jawaban tidak boleh kosong'),
  isCorrect: z.boolean().default(false),
});

const CreateQuestionSchema = z.object({
  questionText: z.string().min(1, 'Teks pertanyaan tidak boleh kosong'),
  explanation: z.string().nullable().optional(),
  options: z
    .array(OptionInputSchema)
    .min(2, 'Pertanyaan harus memiliki minimal 2 pilihan jawaban'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const quizId = params.id;
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = CreateQuestionSchema.parse(body);

    // Validate exactly one correct option
    const correctCount = validated.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      return NextResponse.json(
        { success: false, error: 'Pertanyaan harus memiliki persis 1 jawaban yang benar' },
        { status: 400 }
      );
    }

    // Determine max orderIndex
    const lastQuestion = await db.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { orderIndex: 'desc' },
    });
    const nextOrderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    const question = await db.quizQuestion.create({
      data: {
        quizId,
        questionText: validated.questionText,
        explanation: validated.explanation || null,
        orderIndex: nextOrderIndex,
        options: {
          create: validated.options.map((opt, idx) => ({
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            orderIndex: idx,
          })),
        },
      },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: question,
        message: 'Soal kuis berhasil ditambahkan',
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
    console.error('Error creating question:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menambahkan soal kuis' },
      { status: 500 }
    );
  }
}
