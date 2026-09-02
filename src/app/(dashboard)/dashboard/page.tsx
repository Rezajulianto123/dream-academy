import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { CourseService } from '@/services/course.service';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const tokenCookie = cookies().get('auth_token')?.value;
  const user = tokenCookie ? verifyToken(tokenCookie) : null;

  if (!user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  let courses: any[] = [];
  try {
    courses = await CourseService.getAllCourses();
  } catch (err) {
    courses = [];
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Student Dashboard</h1>
            <p className="text-sm text-slate-500">Selamat datang kembali, {user.email}</p>
          </div>
          <Link
            href="/courses"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
          >
            Jelajahi Katalog Kursus →
          </Link>
        </header>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Kursus yang Tersedia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      Level: {c.level}
                    </span>
                    <span className="text-xs text-slate-500">
                      {c.total_modules} Modul • {c.total_lessons} Lesson
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                    {c.description}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-emerald-600 font-medium">Free Navigation Aktif</span>
                  <Link
                    href={`/courses/${c.slug}`}
                    className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Buka Silabus →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
