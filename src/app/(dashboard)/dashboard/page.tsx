import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Student Dashboard</h1>
            <p className="text-sm text-slate-500">Selamat datang di Dream Academy</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Kembali ke Beranda
          </Link>
        </header>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700 font-bold">Phase 1</span>
            <h2 className="text-lg font-semibold text-slate-900">Fondasi Autentikasi & Database Berhasil Dipasang</h2>
          </div>
          <p className="text-sm text-slate-600">
            Sistem autentikasi (Registrasi, Login, Session Guard, dan Password Encryption) telah aktif dan siap digunakan untuk fase berikutnya.
          </p>
        </div>
      </div>
    </div>
  );
}
