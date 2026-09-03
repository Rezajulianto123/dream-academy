import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { extractYoutubeVideoId } from '@/lib/youtube-utils';
import { z } from 'zod';

const updateLessonSchema = z.object({
  title: z.string().min(1, 'Judul pelajaran wajib diisi').optional(),
  slug: z
    .string()
    .min(1, 'Slug pelajaran wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)')
    .optional(),
  youtubeVideoId: z.string().min(1, 'ID / URL Video YouTube wajib diisi').optional(),
  summaryContent: z.string().optional().nullable(),
  speakingPrompt: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const lesson = await db.lesson.findUnique({
      where: { id: params.id },
      include: {
        quiz: {
          select: { id: true, title: true },
        },
        _count: {
          select: { lessonProgress: true },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Pelajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lesson,
    });
  } catch (error: any) {
    console.error('Error fetching admin lesson detail:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil detail pelajaran' },
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
    const existingLesson = await db.lesson.findUnique({
      where: { id: params.id },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Pelajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateLessonSchema.parse(body);

    let parsedVideoId: string | undefined = undefined;
    if (validatedData.youtubeVideoId) {
      parsedVideoId = extractYoutubeVideoId(validatedData.youtubeVideoId);
      if (!parsedVideoId) {
        return NextResponse.json(
          { success: false, error: 'ID / URL Video YouTube tidak valid' },
          { status: 400 }
        );
      }
    }

    // If slug is changed, check uniqueness within the same module
    if (validatedData.slug && validatedData.slug !== existingLesson.slug) {
      const slugConflict = await db.lesson.findFirst({
        where: {
          moduleId: existingLesson.moduleId,
          slug: validatedData.slug,
        },
      });
      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'Slug pelajaran sudah digunakan dalam modul ini' },
          { status: 400 }
        );
      }
    }

    const updatedLesson = await db.lesson.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.slug !== undefined && { slug: validatedData.slug }),
        ...(parsedVideoId !== undefined && { youtubeVideoId: parsedVideoId }),
        ...(validatedData.summaryContent !== undefined && { summaryContent: validatedData.summaryContent }),
        ...(validatedData.speakingPrompt !== undefined && { speakingPrompt: validatedData.speakingPrompt }),
        ...(validatedData.isPublished !== undefined && { isPublished: validatedData.isPublished }),
        ...(validatedData.orderIndex !== undefined && { orderIndex: validatedData.orderIndex }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedLesson,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating admin lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui pelajaran' },
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
    const lesson = await db.lesson.findUnique({
      where: { id: params.id },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Pelajaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if lesson has student progress or quiz
    const progressCount = await db.lessonProgress.count({
      where: { lessonId: params.id },
    });
    const quizCount = await db.quiz.count({
      where: { lessonId: params.id },
    });

    if (progressCount > 0 || quizCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Tidak dapat menghapus pelajaran yang memiliki riwayat aktivitas siswa atau kuis terikat. Gunakan status Draft untuk menyembunyikan pelajaran.',
        },
        { status: 400 }
      );
    }

    // Hard delete lesson
    await db.lesson.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pelajaran berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting admin lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus pelajaran' },
      { status: 500 }
    );
  }
}
