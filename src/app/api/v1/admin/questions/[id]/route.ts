import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const OptionItemSchema = z.object({
  id: z.string().optional(),
  optionText: z.string().min(1, 'Teks pilihan jawaban tidak boleh kosong'),
  isCorrect: z.boolean().default(false),
});

const UpdateQuestionSchema = z.object({
  questionText: z.string().min(1, 'Teks pertanyaan tidak boleh kosong').optional(),
  explanation: z.string().nullable().optional(),
  options: z.array(OptionItemSchema).min(2, 'Pertanyaan harus memiliki minimal 2 pilihan jawaban').optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const questionId = params.id;
    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Soal kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat soal kuis' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const questionId = params.id;
    const existing = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            _count: {
              select: { attempts: true },
            },
          },
        },
        options: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Soal kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = UpdateQuestionSchema.parse(body);

    if (validated.options) {
      const correctCount = validated.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        return NextResponse.json(
          { success: false, error: 'Pertanyaan harus memiliki persis 1 jawaban yang benar' },
          { status: 400 }
        );
      }

      // Re-create options in transaction for simplicity
      await db.$transaction([
        db.quizQuestion.update({
          where: { id: questionId },
          data: {
            ...(validated.questionText && { questionText: validated.questionText }),
            ...(validated.explanation !== undefined && { explanation: validated.explanation }),
          },
        }),
        db.quizOption.deleteMany({
          where: { questionId },
        }),
        db.quizOption.createMany({
          data: validated.options.map((opt, idx) => ({
            questionId,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            orderIndex: idx,
          })),
        }),
      ]);
    } else {
      await db.quizQuestion.update({
        where: { id: questionId },
        data: {
          ...(validated.questionText && { questionText: validated.questionText }),
          ...(validated.explanation !== undefined && { explanation: validated.explanation }),
        },
      });
    }

    const updatedQuestion = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedQuestion,
      message: 'Soal kuis berhasil diperbarui',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating question:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui soal kuis' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const questionId = params.id;
    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            _count: {
              select: { attempts: true },
            },
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Soal kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    // Dependency Protection Check
    if (question.quiz._count.attempts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak dapat menghapus soal kuis yang sudah memiliki riwayat pengerjaan siswa',
        },
        { status: 400 }
      );
    }

    await db.quizQuestion.delete({
      where: { id: questionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Soal kuis berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus soal kuis' },
      { status: 500 }
    );
  }
}
