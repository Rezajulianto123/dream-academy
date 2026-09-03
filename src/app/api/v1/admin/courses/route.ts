import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import { z } from 'zod';

const createCourseSchema = z.object({
  title: z.string().min(1, 'Judul kursus wajib diisi'),
  slug: z.string().min(1, 'Slug kursus wajib diisi').regex(/^[a-z0-9-]+$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)'),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim().toLowerCase();

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'published') {
      where.isPublished = true;
    } else if (status === 'draft') {
      where.isPublished = false;
    }

    const courses = await db.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    const formattedCourses = courses.map((c) => ({
      ...c,
      imageUrl: c.thumbnailUrl,
    }));

    return NextResponse.json({
      success: true,
      data: formattedCourses,
    });
  } catch (error: any) {
    console.error('Error fetching admin courses:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar kursus' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = requireAuth(req, ['admin']);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const validatedData = createCourseSchema.parse(body);

    // Check unique slug
    const existingCourse = await db.course.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingCourse) {
      return NextResponse.json(
        { success: false, error: 'Slug sudah digunakan oleh kursus lain' },
        { status: 400 }
      );
    }

    const newCourse = await db.course.create({
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        description: validatedData.description || null,
        thumbnailUrl: validatedData.imageUrl || null,
        isPublished: validatedData.isPublished,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newCourse,
          imageUrl: newCourse.thumbnailUrl,
        },
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
    console.error('Error creating admin course:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat kursus baru' },
      { status: 500 }
    );
  }
}
