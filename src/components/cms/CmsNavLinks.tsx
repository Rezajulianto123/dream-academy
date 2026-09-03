'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface CmsNavLinksProps {
  onLinkClick?: () => void;
}

const navItems = [
  {
    name: 'Dashboard',
    href: '/cms',
    badge: null,
  },
  {
    name: 'Courses',
    href: '/cms/courses',
    badge: 'Planned',
  },
  {
    name: 'Modules',
    href: '/cms/modules',
    badge: 'Planned',
  },
  {
    name: 'Lessons',
    href: '/cms/lessons',
    badge: 'Planned',
  },
  {
    name: 'Quizzes',
    href: '/cms/quizzes',
    badge: 'Planned',
  },
  {
    name: 'Students',
    href: '/cms/students',
    badge: 'Planned',
  },
];

export function CmsNavLinks({ onLinkClick }: CmsNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-3 py-4">
      <div className="px-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Menu Utama CMS
      </div>

      {navItems.map((item) => {
        const isActive =
          item.href === '/cms'
            ? pathname === '/cms'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <span>{item.name}</span>
            {item.badge && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
