import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const UpdateOptionSchema = z.object({
  optionText: z.string().min(1, 'Teks pilihan jawaban tidak boleh kosong').optional(),
  isCorrect: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const optionId = params.id;
    const existing = await db.quizOption.findUnique({
      where: { id: optionId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Pilihan jawaban tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = UpdateOptionSchema.parse(body);

    if (validated.isCorrect === true) {
      await db.quizOption.updateMany({
        where: { questionId: existing.questionId },
        data: { isCorrect: false },
      });
    }

    const updatedOption = await db.quizOption.update({
      where: { id: optionId },
      data: {
        ...(validated.optionText && { optionText: validated.optionText }),
        ...(validated.isCorrect !== undefined && { isCorrect: validated.isCorrect }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedOption,
      message: 'Pilihan jawaban berhasil diperbarui',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating option:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui pilihan jawaban' },
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
    const optionId = params.id;
    const option = await db.quizOption.findUnique({
      where: { id: optionId },
      include: {
        question: {
          include: {
            quiz: {
              include: {
                _count: {
                  select: { attempts: true },
                },
              },
            },
          },
        },
      },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, error: 'Pilihan jawaban tidak ditemukan' },
        { status: 404 }
      );
    }

    // Dependency Protection Check
    if (option.question.quiz._count.attempts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak dapat menghapus pilihan jawaban kuis yang sudah memiliki riwayat pengerjaan siswa',
        },
        { status: 400 }
      );
    }

    await db.quizOption.delete({
      where: { id: optionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Pilihan jawaban berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting option:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus pilihan jawaban' },
      { status: 500 }
    );
  }
}
