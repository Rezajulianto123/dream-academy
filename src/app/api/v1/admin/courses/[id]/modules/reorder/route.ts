import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const reorderSchema = z.object({
  moduleIds: z.array(z.string().uuid('ID modul tidak valid')),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const course = await db.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { moduleIds } = reorderSchema.parse(body);

    // Update orderIndex for each module in transaction
    await db.$transaction(
      moduleIds.map((moduleId, index) =>
        db.module.update({
          where: { id: moduleId },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Urutan modul berhasil diperbarui',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error reordering admin modules:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui urutan modul' },
      { status: 500 }
    );
  }
}
