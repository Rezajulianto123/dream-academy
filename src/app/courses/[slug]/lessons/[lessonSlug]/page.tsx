import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { YouTubePlayer } from '@/components/video/YouTubePlayer';
import { CourseService } from '@/services/course.service';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export default async function LessonRoomPage({
  params,
}: {
  params: { slug: string; lessonSlug: string };
}) {
  const tokenCookie = cookies().get('auth_token')?.value;
  const user = tokenCookie ? verifyToken(tokenCookie) : null;

  if (!user) {
    redirect(`/login?callbackUrl=/courses/${params.slug}/lessons/${params.lessonSlug}`);
  }

  let lessonData: any = null;
  try {
    lessonData = await CourseService.getLessonBySlug(
      params.slug,
      params.lessonSlug,
      user.userId
    );
  } catch (error: any) {
    if (error.code === 'COURSE_NOT_FOUND' || error.code === 'LESSON_NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 overflow-x-auto pb-2">
          <Link href="/courses" className="hover:text-indigo-600 shrink-0">
            Katalog Kursus
          </Link>
          <span>/</span>
          <Link href={`/courses/${lessonData.course_slug}`} className="hover:text-indigo-600 shrink-0">
            {lessonData.course_title}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold shrink-0">{lessonData.title}</span>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (Left 2-columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lesson Title & Module Badge */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                {lessonData.module_title}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {lessonData.title}
              </h1>
            </div>

            {/* Interactive YouTube Video Learning Player (Phase 3) */}
            <YouTubePlayer
              videoId={lessonData.youtube_video_id}
              lessonId={lessonData.id}
              courseSlug={params.slug}
              lessonSlug={params.lessonSlug}
              initialVideoCompleted={lessonData.user_progress.video_completed}
            />

            {/* Speaking Practice Card (Phase 4 Preparation) */}
            {lessonData.speaking_prompt && (
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-200 p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                  <span>🗣️ Panduan Speaking Practice</span>
                </div>
                <p className="text-sm font-medium text-slate-800 whitespace-pre-line bg-white/80 p-4 rounded-lg border border-indigo-100">
                  {lessonData.speaking_prompt}
                </p>
                <p className="text-xs text-indigo-600 italic">
                  💡 Tips: Latihlah berbicara dengan lantang. Fitur perekaman suara lokal in-browser akan aktif pada Phase 4.
                </p>
              </div>
            )}

            {/* Rangkuman Materi Markdown */}
            {lessonData.summary_content && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Rangkuman & Poin Pembelajaran
                </h2>
                <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-line text-slate-700">
                  {lessonData.summary_content}
                </div>
              </div>
            )}

            {/* Checkpoint Quiz Banner (Phase 5 Preparation) */}
            {lessonData.quiz && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                    Checkpoint Quiz
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {lessonData.quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Passing score: {lessonData.quiz.passing_score}% • Unlimited Retakes (PRD-03)
                  </p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg cursor-not-allowed border border-slate-200"
                >
                  Kuis Aktif pada Phase 5
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar: Free Navigation Syllabus Drawer */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Daftar Materi Kursus</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Free Nav
                </span>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
                {lessonData.syllabus.map((module: any, modIdx: number) => (
                  <div key={module.id} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {module.title}
                    </h4>
                    <div className="space-y-1">
                      {module.lessons.map((lesson: any, lesIdx: number) => (
                        <Link
                          key={lesson.id}
                          href={`/courses/${lessonData.course_slug}/lessons/${lesson.slug}`}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-medium transition-colors ${
                            lesson.is_current
                              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            lesson.is_current ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {modIdx + 1}.{lesIdx + 1}
                          </span>
                          <span className="truncate">{lesson.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
