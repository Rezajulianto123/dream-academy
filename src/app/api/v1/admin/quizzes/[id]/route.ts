import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const UpdateQuizSchema = z.object({
  title: z.string().min(1, 'Judul kuis tidak boleh kosong').max(255).optional(),
  passingScore: z.number().int().min(1).max(100).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const quizId = params.id;
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        _count: {
          select: { attempts: true },
        },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: quiz,
    });
  } catch (error: any) {
    console.error('Error fetching quiz detail:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat kuis' },
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
    const quizId = params.id;
    const existing = await db.quiz.findUnique({
      where: { id: quizId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = UpdateQuizSchema.parse(body);

    const updatedQuiz = await db.quiz.update({
      where: { id: quizId },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.passingScore !== undefined && { passingScore: validated.passingScore }),
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedQuiz,
      message: 'Detail kuis berhasil diperbarui',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating quiz:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui kuis' },
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
    const quizId = params.id;
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Kuis tidak ditemukan' },
        { status: 404 }
      );
    }

    // Dependency Protection Check
    if (quiz._count.attempts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak dapat menghapus kuis yang sudah memiliki riwayat pengerjaan siswa',
        },
        { status: 400 }
      );
    }

    // Hard delete quiz
    await db.quiz.delete({
      where: { id: quizId },
    });

    return NextResponse.json({
      success: true,
      message: 'Kuis berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus kuis' },
      { status: 500 }
    );
  }
}
