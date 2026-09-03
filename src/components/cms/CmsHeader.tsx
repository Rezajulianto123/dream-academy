'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { CmsUserMenu } from './CmsUserMenu';

interface CmsHeaderProps {
  onMenuToggle: () => void;
}

const routeTitles: Record<string, string> = {
  '/cms': 'CMS Dashboard Overview',
  '/cms/courses': 'Manajemen Kursus (Courses)',
  '/cms/modules': 'Manajemen Modul (Modules)',
  '/cms/lessons': 'Manajemen Materi (Lessons)',
  '/cms/quizzes': 'Manajemen Soal (Quizzes)',
  '/cms/students': 'Direktori Siswa (Students)',
};

export function CmsHeader({ onMenuToggle }: CmsHeaderProps) {
  const pathname = usePathname();
  const currentTitle = routeTitles[pathname] || 'Dream Academy CMS';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onMenuToggle}
          type="button"
          aria-label="Buka Menu Navigasi"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {currentTitle}
        </h1>
      </div>

      <CmsUserMenu />
    </header>
  );
}
