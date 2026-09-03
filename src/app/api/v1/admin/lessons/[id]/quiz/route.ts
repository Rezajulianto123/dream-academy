import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const CreateQuizSchema = z.object({
  title: z.string().min(1, 'Judul kuis tidak boleh kosong').max(255),
  passingScore: z.number().int().min(1).max(100).optional().default(70),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const lessonId = params.id;
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Pelajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    const quiz = await db.quiz.findUnique({
      where: { lessonId },
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

    return NextResponse.json({
      success: true,
      data: quiz,
    });
  } catch (error: any) {
    console.error('Error fetching admin quiz:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat kuis' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const lessonId = params.id;
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Pelajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    const existingQuiz = await db.quiz.findUnique({
      where: { lessonId },
    });

    if (existingQuiz) {
      return NextResponse.json(
        { success: false, error: 'Pelajaran ini sudah memiliki kuis' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = CreateQuizSchema.parse(body);

    const quiz = await db.quiz.create({
      data: {
        lessonId,
        title: validated.title,
        passingScore: validated.passingScore,
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: quiz,
        message: 'Kuis berhasil dibuat',
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
    console.error('Error creating admin quiz:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat kuis' },
      { status: 500 }
    );
  }
}
