'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setUser(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-indigo-600 tracking-tight">Dream Academy</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700">MVP</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/courses" className="hover:text-indigo-600 transition-colors">
              Katalog Kursus
            </Link>
            {user && (
              <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
                Dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-8 bg-slate-100 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                Halo, <span className="font-semibold text-slate-900">{user.full_name}</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Daftar Gratis
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
