'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CmsLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Generic error message for authentication failures
        setError('Email atau password salah');
        return;
      }

      const role = data.data?.user?.role;
      if (role !== 'admin') {
        setError('Akses CMS khusus untuk Administrator');
        return;
      }

      // Successful Admin login always redirects to /cms
      window.location.href = '/cms';
    } catch (err: any) {
      setError('Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-busy={loading}>
      {error && (
        <div
          role="alert"
          className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="cms-email" className="block text-sm font-medium text-slate-700 mb-1">
          Email Admin
        </label>
        <input
          id="cms-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="admin@dreamacademy.id"
        />
      </div>

      <div>
        <label htmlFor="cms-password" className="block text-sm font-medium text-slate-700 mb-1">
          Password
        </label>
        <input
          id="cms-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!error}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Memproses...</span>
          </>
        ) : (
          'Masuk ke CMS'
        )}
      </button>
    </form>
  );
}
