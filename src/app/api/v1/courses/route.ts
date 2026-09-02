import { NextResponse } from 'next/server';
import { CourseService } from '@/services/course.service';

export async function GET() {
  try {
    const courses = await CourseService.getAllCourses();

    return NextResponse.json(
      {
        success: true,
        data: courses,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Terjadi kesalahan saat mengambil daftar kursus.',
          details: [],
        },
      },
      { status: error.status || 500 }
    );
  }
}
