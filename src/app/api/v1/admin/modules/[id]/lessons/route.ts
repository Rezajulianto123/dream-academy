import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { extractYoutubeVideoId } from '@/lib/youtube-utils';
import { z } from 'zod';

const createLessonSchema = z.object({
  title: z.string().min(1, 'Judul pelajaran wajib diisi'),
  slug: z
    .string()
    .min(1, 'Slug pelajaran wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)'),
  youtubeVideoId: z.string().min(1, 'ID / URL Video YouTube wajib diisi'),
  summaryContent: z.string().optional().nullable(),
  speakingPrompt: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
  orderIndex: z.number().int().nonnegative().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const moduleItem = await db.module.findUnique({
      where: { id: params.id },
    });

    if (!moduleItem) {
      return NextResponse.json(
        { success: false, error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    const lessons = await db.lesson.findMany({
      where: { moduleId: params.id },
      orderBy: { orderIndex: 'asc' },
      include: {
        quiz: {
          select: { id: true, title: true },
        },
        _count: {
          select: { lessonProgress: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: lessons,
    });
  } catch (error: any) {
    console.error('Error fetching admin lessons:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar pelajaran' },
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
    const moduleItem = await db.module.findUnique({
      where: { id: params.id },
    });

    if (!moduleItem) {
      return NextResponse.json(
        { success: false, error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = createLessonSchema.parse(body);

    const parsedVideoId = extractYoutubeVideoId(validatedData.youtubeVideoId);
    if (!parsedVideoId) {
      return NextResponse.json(
        { success: false, error: 'ID / URL Video YouTube tidak valid' },
        { status: 400 }
      );
    }

    // Check unique slug per module
    const existingLesson = await db.lesson.findFirst({
      where: {
        moduleId: params.id,
        slug: validatedData.slug,
      },
    });

    if (existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Slug pelajaran sudah digunakan dalam modul ini' },
        { status: 400 }
      );
    }

    // Determine orderIndex if not provided
    let finalOrderIndex = validatedData.orderIndex;
    if (finalOrderIndex === undefined) {
      const maxOrder = await db.lesson.aggregate({
        where: { moduleId: params.id },
        _max: { orderIndex: true },
      });
      finalOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    }

    const newLesson = await db.lesson.create({
      data: {
        moduleId: params.id,
        title: validatedData.title,
        slug: validatedData.slug,
        youtubeVideoId: parsedVideoId,
        summaryContent: validatedData.summaryContent || null,
        speakingPrompt: validatedData.speakingPrompt || null,
        isPublished: validatedData.isPublished,
        orderIndex: finalOrderIndex,
      },
    });

    return NextResponse.json(
      { success: true, data: newLesson },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating admin lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat pelajaran baru' },
      { status: 500 }
    );
  }
}
