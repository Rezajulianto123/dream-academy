'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { CmsNavLinks } from './CmsNavLinks';

interface CmsSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function CmsSidebar({ isMobileOpen, onMobileClose }: CmsSidebarProps) {
  // Listen to Escape key to close drawer on mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onMobileClose]);

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside
        aria-label="Sidebar Navigasi CMS Desktop"
        className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-100 h-screen fixed top-0 left-0 border-r border-slate-800 z-20"
      >
        <div className="h-16 px-6 flex items-center border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            DA
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white">Dream Academy</div>
            <div className="text-[10px] text-slate-400 font-mono">v1.0.0-admin</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CmsNavLinks />
        </div>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Dream Academy CMS &copy; {new Date().getFullYear()}
        </div>
      </aside>

      {/* 2. Mobile / Tablet Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            onClick={onMobileClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over Drawer Content */}
          <aside
            aria-label="Sidebar Navigasi CMS Mobile"
            className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-100 h-full shadow-2xl z-10"
          >
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                  DA
                </div>
                <span className="font-bold text-sm text-white">Dream Academy CMS</span>
              </div>
              <button
                onClick={onMobileClose}
                type="button"
                aria-label="Tutup Menu Navigasi"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <CmsNavLinks onLinkClick={onMobileClose} />
            </div>

            <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
              Dream Academy CMS Mobile
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
