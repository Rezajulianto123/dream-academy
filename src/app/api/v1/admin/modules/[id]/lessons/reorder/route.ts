import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const reorderSchema = z.object({
  lessonIds: z.array(z.string().uuid('ID pelajaran tidak valid')),
});

export async function PUT(
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
    const { lessonIds } = reorderSchema.parse(body);

    // Update orderIndex for each lesson in transaction
    await db.$transaction(
      lessonIds.map((lessonId, index) =>
        db.lesson.update({
          where: { id: lessonId },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Urutan pelajaran berhasil diperbarui',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error reordering admin lessons:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui urutan pelajaran' },
      { status: 500 }
    );
  }
}
