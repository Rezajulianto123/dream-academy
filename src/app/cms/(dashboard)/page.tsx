import React from 'react';
import Link from 'next/link';

export default function CmsDashboardPage() {
  return (
    <div className="space-y-6">
      {/* 1. Welcome Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-2">
        <h2 className="text-xl font-bold text-slate-900">
          Selamat Datang di Portal CMS Dream Academy
        </h2>
        <p className="text-sm text-slate-600">
          Fondasi antarmuka manajerial terpusat untuk mengelola kurikulum, modul, materi lesson, dan bank soal Dream Academy.
        </p>
      </div>

      {/* 2. System Readiness Overview (Non-sensitive info) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Lingkungan System</div>
          <div className="text-lg font-bold text-slate-900 mt-1">Development / Production</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Next.js App Router 14</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Versi Platform</div>
          <div className="text-lg font-bold text-slate-900 mt-1">v1.0.0-admin</div>
          <div className="text-[11px] text-slate-400 mt-0.5">BUILD-06.2.2 Shell Base</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Status Otorisasi</div>
          <div className="text-lg font-bold text-emerald-600 mt-1">Active Administrator</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Role Guard: Server-Side Active</div>
        </div>
      </div>

      {/* 3. Quick Access Placeholder Modules */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Modul Manajerial CMS (Rencana Pengembangan)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/cms/courses" className="block group">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group-hover:border-slate-400 group-hover:shadow transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 group-hover:text-indigo-600">Courses</span>
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  BUILD-06.3
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manajemen data kursus, judul, deskripsi, slug, dan status publikasi.
              </p>
            </div>
          </Link>

          <Link href="/cms/modules" className="block group">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group-hover:border-slate-400 group-hover:shadow transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 group-hover:text-indigo-600">Modules</span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  Planned
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pengelompokan modul dalam kursus, penataan urutan, dan hirarki.
              </p>
            </div>
          </Link>

          <Link href="/cms/lessons" className="block group">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group-hover:border-slate-400 group-hover:shadow transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 group-hover:text-indigo-600">Lessons</span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  Planned
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manajemen materi lesson, ID video YouTube, dan urutan materi.
              </p>
            </div>
          </Link>

          <Link href="/cms/quizzes" className="block group">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group-hover:border-slate-400 group-hover:shadow transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 group-hover:text-indigo-600">Quizzes</span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  Planned
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visual Quiz Builder, pembuat pertanyaan, dan opsi jawaban.
              </p>
            </div>
          </Link>

          <Link href="/cms/students" className="block group">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group-hover:border-slate-400 group-hover:shadow transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 group-hover:text-indigo-600">Students</span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  Planned
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direktori siswa terdaftar dan informasi akun siswa.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
