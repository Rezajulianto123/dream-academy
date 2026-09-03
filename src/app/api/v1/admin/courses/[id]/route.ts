import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const updateCourseSchema = z.object({
  title: z.string().min(1, 'Judul kursus wajib diisi').optional(),
  slug: z
    .string()
    .min(1, 'Slug kursus wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)')
    .optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const course = await db.course.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...course,
        imageUrl: course.thumbnailUrl,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin course detail:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil detail kursus' },
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
    const existingCourse = await db.course.findUnique({
      where: { id: params.id },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateCourseSchema.parse(body);

    // If slug is changed, check uniqueness
    if (validatedData.slug && validatedData.slug !== existingCourse.slug) {
      const slugConflict = await db.course.findUnique({
        where: { slug: validatedData.slug },
      });
      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'Slug sudah digunakan oleh kursus lain' },
          { status: 400 }
        );
      }
    }

    const updatedCourse = await db.course.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.slug !== undefined && { slug: validatedData.slug }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.imageUrl !== undefined && { thumbnailUrl: validatedData.imageUrl }),
        ...(validatedData.isPublished !== undefined && { isPublished: validatedData.isPublished }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCourse,
        imageUrl: updatedCourse.thumbnailUrl,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating admin course:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui kursus' },
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
    const course = await db.course.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check active enrollments
    if (course._count.enrollments > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Tidak dapat menghapus kursus yang memiliki siswa terdaftar. Gunakan status Draft untuk menyembunyikan kursus dari katalog.',
        },
        { status: 400 }
      );
    }

    await db.course.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Kursus berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting admin course:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus kursus' },
      { status: 500 }
    );
  }
}
