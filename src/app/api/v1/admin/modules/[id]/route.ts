import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const updateModuleSchema = z.object({
  title: z.string().min(1, 'Judul modul wajib diisi').optional(),
  slug: z
    .string()
    .min(1, 'Slug modul wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)')
    .optional(),
  description: z.string().optional().nullable(),
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
    const moduleItem = await db.module.findUnique({
      where: { id: params.id },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { lessons: true },
        },
      },
    });

    if (!moduleItem) {
      return NextResponse.json(
        { success: false, error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: moduleItem,
    });
  } catch (error: any) {
    console.error('Error fetching admin module detail:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil detail modul' },
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
    const existingModule = await db.module.findUnique({
      where: { id: params.id },
    });

    if (!existingModule) {
      return NextResponse.json(
        { success: false, error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateModuleSchema.parse(body);

    // If slug is changed, check uniqueness within the same course
    if (validatedData.slug && validatedData.slug !== existingModule.slug) {
      const slugConflict = await db.module.findFirst({
        where: {
          courseId: existingModule.courseId,
          slug: validatedData.slug,
        },
      });
      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'Slug modul sudah digunakan dalam kursus ini' },
          { status: 400 }
        );
      }
    }

    const updatedModule = await db.module.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.slug !== undefined && { slug: validatedData.slug }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.isPublished !== undefined && { isPublished: validatedData.isPublished }),
        ...(validatedData.orderIndex !== undefined && { orderIndex: validatedData.orderIndex }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedModule,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating admin module:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui modul' },
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
    const moduleItem = await db.module.findUnique({
      where: { id: params.id },
    });

    if (!moduleItem) {
      return NextResponse.json(
        { success: false, error: 'Modul tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if any lesson inside this module has student progress
    const progressCount = await db.lessonProgress.count({
      where: {
        lesson: {
          moduleId: params.id,
        },
      },
    });

    if (progressCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Tidak dapat menghapus modul yang memiliki riwayat aktivitas siswa. Gunakan status Draft untuk menyembunyikan modul.',
        },
        { status: 400 }
      );
    }

    // Hard delete module (cascades to child lessons with 0 progress)
    await db.module.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Modul berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting admin module:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus modul' },
      { status: 500 }
    );
  }
}
