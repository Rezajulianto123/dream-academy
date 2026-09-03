import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const createModuleSchema = z.object({
  title: z.string().min(1, 'Judul modul wajib diisi'),
  slug: z
    .string()
    .min(1, 'Slug modul wajib diisi')
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)'),
  description: z.string().optional().nullable(),
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
    const course = await db.course.findUnique({
      where: { id: params.id },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    const modules = await db.module.findMany({
      where: { courseId: params.id },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        slug: true,
        description: true,
        isPublished: true,
        orderIndex: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { lessons: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: modules,
    });
  } catch (error: any) {
    console.error('Error fetching admin modules:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar modul' },
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
    const validatedData = createModuleSchema.parse(body);

    // Check unique slug per course
    const existingModule = await db.module.findFirst({
      where: {
        courseId: params.id,
        slug: validatedData.slug,
      },
    });

    if (existingModule) {
      return NextResponse.json(
        { success: false, error: 'Slug modul sudah digunakan dalam kursus ini' },
        { status: 400 }
      );
    }

    // Determine orderIndex if not provided
    let finalOrderIndex = validatedData.orderIndex;
    if (finalOrderIndex === undefined) {
      const maxOrder = await db.module.aggregate({
        where: { courseId: params.id },
        _max: { orderIndex: true },
      });
      finalOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    }

    const newModule = await db.module.create({
      data: {
        courseId: params.id,
        title: validatedData.title,
        slug: validatedData.slug,
        description: validatedData.description || null,
        isPublished: validatedData.isPublished,
        orderIndex: finalOrderIndex,
      },
    });

    return NextResponse.json(
      { success: true, data: newModule },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating admin module:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat modul baru' },
      { status: 500 }
    );
  }
}
