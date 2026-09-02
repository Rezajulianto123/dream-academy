import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dream Academy — Belajar Bahasa Inggris Berani & Percaya Diri',
  description: 'Platform e-learning modern untuk pembelajar bahasa Inggris Indonesia yang fokus pada keberanian dan kelancaran berbicara (fluency over perfection).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
