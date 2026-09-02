import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
            🚀 Dream Academy MVP
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Bicara Bahasa Inggris dengan <span className="text-indigo-600">Percaya Diri</span> Tanpa Takut Salah
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Platform pembelajaran aktif untuk pembelajar Indonesia. Tonton video kurasi YouTube, latih speaking privat di browser, dan ukur progresmu setiap hari.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/courses"
              className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Lihat Katalog Kursus →
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-lg bg-white text-slate-700 border border-slate-300 font-medium hover:bg-slate-50 transition-colors"
            >
              Daftar Akun Baru
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
