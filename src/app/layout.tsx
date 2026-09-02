import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream Academy — Interactive English Learning Platform",
  description:
    "Platform pembelajaran bahasa Inggris interaktif dengan navigasi bebas, latihan speaking mandiri, dan checkpoint kuis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased flex flex-col min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-200">
                D
              </span>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Dream<span className="text-indigo-600">Academy</span>
              </span>
            </a>
            <nav className="flex items-center gap-3">
              <a
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition"
              >
                Masuk
              </a>
              <a
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                Daftar Gratis
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
          <div className="container mx-auto max-w-7xl px-4">
            © {new Date().getFullYear()} Dream Academy. Built for confident English learners.
          </div>
        </footer>
      </body>
    </html>
  );
}
