import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { CourseService } from '@/services/course.service';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  let courses: any[] = [];
  try {
    courses = await CourseService.getAllCourses();
  } catch (err) {
    courses = [];
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            📚 Kurikulum Speaking Aktif
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Katalog Kursus Speaking
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Pilih kursus yang dirancang khusus untuk membangun rasa percaya diri berbicara bahasa Inggris tanpa rasa takut salah grammar.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">Belum ada kursus yang dipublikasikan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Level: {course.level}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {course.total_modules} Modul • {course.total_lessons} Lesson
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900 leading-snug">
                      {course.title}
                    </h2>
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-600">Free Navigation (Bebas Akses)</span>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Lihat Silabus →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
