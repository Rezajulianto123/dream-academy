'use client';

import React, { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function CmsUserMenu() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchAdminProfile() {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUser(json.data);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil profil admin:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminProfile();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error saat logout:', err);
    } finally {
      window.location.href = '/cms/login';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-slate-200" />
        <div className="space-y-1 hidden sm:block">
          <div className="w-24 h-3 bg-slate-200 rounded" />
          <div className="w-32 h-2.5 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 border-r border-slate-200 pr-3 sm:pr-4">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center border border-slate-700 shadow-sm">
          {getInitials(user?.fullName)}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-sm font-semibold text-slate-900 leading-tight">
            {user?.fullName || 'System Administrator'}
          </span>
          <span className="text-xs text-slate-500 leading-tight">
            {user?.email || 'admin@dreamacademy.id'}
          </span>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md">
          ADMIN
        </span>
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        title="Logout dari CMS"
        aria-label="Logout dari CMS"
        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
      >
        {loggingOut ? 'Memproses...' : 'Logout'}
      </button>
    </div>
  );
}
