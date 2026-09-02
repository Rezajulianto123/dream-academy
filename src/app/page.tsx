export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 sm:px-6 lg:px-8 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 mb-8">
        ✨ Platform Belajar Speaking Bahasa Inggris Modern
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl max-w-4xl">
        Kuasai Percakapan Bahasa Inggris dengan{" "}
        <span className="text-indigo-600">Percaya Diri & Tanpa Takut Salah</span>
      </h1>

      <p className="mt-6 text-lg text-slate-600 max-w-2xl text-balance">
        Belajar mandiri dengan kurikulum berbasis video interaktif, latihan speaking dengan perekaman audio lokal di browser tanpa beban, serta checkpoint kuis untuk menguji pemahaman Anda.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href="/register"
          className="rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
        >
          Mulai Belajar Sekarang — Gratis
        </a>
        <a
          href="/login"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Sudah Punya Akun? Masuk
        </a>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl text-left">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-900">Navigasi Bebas</h3>
          <p className="mt-2 text-sm text-slate-600">
            Akses materi apa pun kapan saja tanpa terikat urutan kaku. Belajar topik yang paling Anda butuhkan.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-900">Latihan Speaking Privat</h3>
          <p className="mt-2 text-sm text-slate-600">
            Rekam dan dengarkan suara Anda sendiri langsung di browser. Tanpa rekaman suara diunggah ke internet (100% aman).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4">
            3
          </div>
          <h3 className="text-lg font-bold text-slate-900">Kuis & Evaluasi Nilai Terbaik</h3>
          <p className="mt-2 text-sm text-slate-600">
            Uji pemahaman Anda dengan kuis berulang kali tanpa batas (*unlimited retakes*). Sistem otomatis mencatat nilai tertinggi Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
