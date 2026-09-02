import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { CourseService } from '@/services/course.service';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const tokenCookie = cookies().get('auth_token')?.value;
  const user = tokenCookie ? verifyToken(tokenCookie) : null;

  let course: any = null;
  try {
    course = await CourseService.getCourseBySlug(params.slug, user?.userId);
  } catch (error: any) {
    notFound();
  }

  if (!course) {
    notFound();
  }

  const firstLesson = course.modules[0]?.lessons[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/courses" className="hover:text-indigo-600">
            Katalog Kursus
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{course.title}</span>
        </div>

        {/* Course Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase border border-emerald-200">
              Level: {course.level}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {course.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              {course.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
            <div>
              <span className="font-semibold text-slate-900">{course.total_modules}</span> Modul
            </div>
            <div>
              <span className="font-semibold text-slate-900">{course.total_lessons}</span> Lesson
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <span>Progres: <strong className="text-indigo-600">{course.user_progress_percentage}%</strong></span>
                <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${course.user_progress_percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {firstLesson && (
            <div className="pt-2">
              <Link
                href={`/courses/${course.slug}/lessons/${firstLesson.slug}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Mulai Belajar Sekarang →
              </Link>
            </div>
          )}
        </div>

        {/* Free Navigation Syllabus */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Silabus & Materi Kursus</h2>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              ⚡ Free Navigation (Bebas Membuka Lesson Mana Saja)
            </span>
          </div>

          <div className="space-y-4">
            {course.modules.map((module: any, modIdx: number) => (
              <div
                key={module.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-100">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    Modul {modIdx + 1}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {module.title}
                  </h3>
                  {module.description && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      {module.description}
                    </p>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {module.lessons.map((lesson: any, lesIdx: number) => (
                    <div
                      key={lesson.id}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                          lesson.is_completed
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {lesson.is_completed ? '✓' : `${modIdx + 1}.${lesIdx + 1}`}
                        </span>
                        <div>
                          <Link
                            href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                            className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {lesson.title}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>Video & Speaking Practice</span>
                            {lesson.best_quiz_score !== null && (
                              <span className="text-emerald-600 font-medium">
                                • Kuis: {lesson.best_quiz_score}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/courses/${course.slug}/lessons/${lesson.slug}`}
                        className="px-3 py-1.5 rounded text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        Buka Lesson →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
