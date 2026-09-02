import React from 'react';
import { CmsLoginForm } from '@/components/cms/CmsLoginForm';

export const metadata = {
  title: 'Admin Login | CMS Dream Academy',
  description: 'Halaman autentikasi khusus Administrator CMS Dream Academy',
};

export default function CmsLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-800 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-xl mb-2">
            DA
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dream Academy CMS</h1>
          <p className="text-sm text-slate-500">Portal Administrasi & Manajerial Konten</p>
        </div>

        <CmsLoginForm />

        <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          Akses terbatas hanya untuk Administrator terdaftar.
        </div>
      </div>
    </div>
  );
}
