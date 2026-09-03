'use client';

import React, { useState } from 'react';
import { CmsSidebar } from './CmsSidebar';
import { CmsHeader } from './CmsHeader';

interface CmsShellLayoutProps {
  children: React.ReactNode;
}

export function CmsShellLayout({ children }: CmsShellLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <CmsSidebar
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen transition-all">
        <CmsHeader onMenuToggle={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
