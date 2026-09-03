'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface LessonItem {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  youtubeVideoId: string;
  summaryContent: string | null;
  speakingPrompt: string | null;
  isPublished: boolean;
  orderIndex: number;
  _count?: {
    lessonProgress: number;
  };
  quiz?: {
    id: string;
    title: string;
  } | null;
}

interface ModuleItem {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  orderIndex: number;
  lessons: LessonItem[];
  _count?: {
    lessons: number;
  };
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
}

export default function CmsCurriculumBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Accordion open states
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Module Modal State
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    slug: '',
    description: '',
    isPublished: false,
  });
  const [isAutoSlugModule, setIsAutoSlugModule] = useState(true);

  // Lesson Modal State
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    slug: '',
    youtubeVideoId: '',
    summaryContent: '',
    speakingPrompt: '',
    isPublished: false,
  });
  const [isAutoSlugLesson, setIsAutoSlugLesson] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const fetchCurriculumData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Course Detail
      const courseRes = await fetch(`/api/v1/admin/courses/${courseId}`);
      if (courseRes.status === 401) {
        router.push('/cms/login');
        return;
      }
      if (courseRes.status === 403) {
        setErrorMsg('Akses ditolak. Anda tidak memiliki izin Admin.');
        setLoading(false);
        return;
      }
      const courseJson = await courseRes.json();
      if (!courseJson.success) {
        setErrorMsg(courseJson.error || 'Gagal memuat detail kursus');
        setLoading(false);
        return;
      }
      setCourse(courseJson.data);

      // 2. Fetch Modules List
      const modulesRes = await fetch(`/api/v1/admin/courses/${courseId}/modules`);
      const modulesJson = await modulesRes.json();
      if (modulesJson.success) {
        const modulesData: ModuleItem[] = modulesJson.data;

        // 3. Fetch Lessons for each module
        const fullModules = await Promise.all(
          modulesData.map(async (mod) => {
            const lessonsRes = await fetch(`/api/v1/admin/modules/${mod.id}/lessons`);
            const lessonsJson = await lessonsRes.json();
            return {
              ...mod,
              lessons: lessonsJson.success ? lessonsJson.data : [],
            };
          })
        );

        setModules(fullModules);
        // Expand first module by default
        if (fullModules.length > 0) {
          setExpandedModules((prev) => ({
            ...prev,
            [fullModules[0].id]: true,
          }));
        }
      }
    } catch (err: any) {
      console.error('Error loading curriculum:', err);
      setErrorMsg('Terjadi kesalahan koneksi saat memuat kurikulum.');
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    if (courseId) {
      fetchCurriculumData();
    }
  }, [courseId, fetchCurriculumData]);

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Module Actions
  const handleOpenModuleModal = (moduleToEdit?: ModuleItem) => {
    if (moduleToEdit) {
      setEditingModule(moduleToEdit);
      setModuleForm({
        title: moduleToEdit.title,
        slug: moduleToEdit.slug,
        description: moduleToEdit.description || '',
        isPublished: moduleToEdit.isPublished,
      });
      setIsAutoSlugModule(false);
    } else {
      setEditingModule(null);
      setModuleForm({ title: '', slug: '', description: '', isPublished: false });
      setIsAutoSlugModule(true);
    }
    setIsModuleModalOpen(true);
  };

  const handleModuleTitleChange = (val: string) => {
    setModuleForm((prev) => ({
      ...prev,
      title: val,
      slug: isAutoSlugModule ? slugify(val) : prev.slug,
    }));
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingModule
        ? `/api/v1/admin/modules/${editingModule.id}`
        : `/api/v1/admin/courses/${courseId}/modules`;
      const method = editingModule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleForm.title,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          isPublished: moduleForm.isPublished,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menyimpan modul');
        setIsSubmitting(false);
        return;
      }

      showToast('success', editingModule ? 'Modul berhasil diperbarui' : 'Modul baru berhasil dibuat');
      setIsModuleModalOpen(false);
      fetchCurriculumData();
    } catch (err: any) {
      showToast('error', 'Terjadi kesalahan saat menyimpan modul');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublishModule = async (moduleItem: ModuleItem) => {
    try {
      const res = await fetch(`/api/v1/admin/modules/${moduleItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !moduleItem.isPublished }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal mengubah status publikasi modul');
        return;
      }
      showToast(
        'success',
        `Status modul diubah menjadi ${!moduleItem.isPublished ? 'Published' : 'Draft'}`
      );
      fetchCurriculumData();
    } catch (err) {
      showToast('error', 'Gagal mengubah status publikasi modul');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus modul ini? Seluruh pelajaran di dalamnya yang belum memiliki aktivitas siswa akan ikut terhapus.')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/modules/${moduleId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menghapus modul');
        return;
      }
      showToast('success', 'Modul berhasil dihapus');
      fetchCurriculumData();
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menghapus modul');
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const newModules = [...modules];
    const temp = newModules[index];
    newModules[index] = newModules[targetIndex];
    newModules[targetIndex] = temp;

    const moduleIds = newModules.map((m) => m.id);

    // Optimistic state
    setModules(newModules);

    try {
      const res = await fetch(`/api/v1/admin/courses/${courseId}/modules/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal memperbarui urutan modul');
        fetchCurriculumData();
      } else {
        showToast('success', 'Urutan modul berhasil diperbarui');
      }
    } catch (err) {
      showToast('error', 'Gagal memperbarui urutan modul');
      fetchCurriculumData();
    }
  };

  // Lesson Actions
  const handleOpenLessonModal = (moduleId: string, lessonToEdit?: LessonItem) => {
    setActiveModuleForLesson(moduleId);
    if (lessonToEdit) {
      setEditingLesson(lessonToEdit);
      setLessonForm({
        title: lessonToEdit.title,
        slug: lessonToEdit.slug,
        youtubeVideoId: lessonToEdit.youtubeVideoId,
        summaryContent: lessonToEdit.summaryContent || '',
        speakingPrompt: lessonToEdit.speakingPrompt || '',
        isPublished: lessonToEdit.isPublished,
      });
      setIsAutoSlugLesson(false);
    } else {
      setEditingLesson(null);
      setLessonForm({
        title: '',
        slug: '',
        youtubeVideoId: '',
        summaryContent: '',
        speakingPrompt: '',
        isPublished: false,
      });
      setIsAutoSlugLesson(true);
    }
    setIsLessonModalOpen(true);
  };

  const handleLessonTitleChange = (val: string) => {
    setLessonForm((prev) => ({
      ...prev,
      title: val,
      slug: isAutoSlugLesson ? slugify(val) : prev.slug,
    }));
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForLesson && !editingLesson) return;
    setIsSubmitting(true);

    try {
      const url = editingLesson
        ? `/api/v1/admin/lessons/${editingLesson.id}`
        : `/api/v1/admin/modules/${activeModuleForLesson}/lessons`;
      const method = editingLesson ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lessonForm.title,
          slug: lessonForm.slug,
          youtubeVideoId: lessonForm.youtubeVideoId,
          summaryContent: lessonForm.summaryContent || null,
          speakingPrompt: lessonForm.speakingPrompt || null,
          isPublished: lessonForm.isPublished,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menyimpan pelajaran');
        setIsSubmitting(false);
        return;
      }

      showToast('success', editingLesson ? 'Pelajaran berhasil diperbarui' : 'Pelajaran baru berhasil dibuat');
      setIsLessonModalOpen(false);
      fetchCurriculumData();
    } catch (err: any) {
      showToast('error', 'Terjadi kesalahan saat menyimpan pelajaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublishLesson = async (lessonItem: LessonItem) => {
    try {
      const res = await fetch(`/api/v1/admin/lessons/${lessonItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !lessonItem.isPublished }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal mengubah status publikasi pelajaran');
        return;
      }
      showToast(
        'success',
        `Status pelajaran diubah menjadi ${!lessonItem.isPublished ? 'Published' : 'Draft'}`
      );
      fetchCurriculumData();
    } catch (err) {
      showToast('error', 'Gagal mengubah status publikasi pelajaran');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pelajaran ini?')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menghapus pelajaran');
        return;
      }
      showToast('success', 'Pelajaran berhasil dihapus');
      fetchCurriculumData();
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menghapus pelajaran');
    }
  };

  const handleMoveLesson = async (
    moduleId: string,
    lessonIndex: number,
    direction: 'up' | 'down'
  ) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= mod.lessons.length) return;

    const newLessons = [...mod.lessons];
    const temp = newLessons[lessonIndex];
    newLessons[lessonIndex] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    const lessonIds = newLessons.map((l) => l.id);

    // Optimistic UI
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: newLessons } : m))
    );

    try {
      const res = await fetch(`/api/v1/admin/modules/${moduleId}/lessons/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal memperbarui urutan pelajaran');
        fetchCurriculumData();
      } else {
        showToast('success', 'Urutan pelajaran berhasil diperbarui');
      }
    } catch (err) {
      showToast('error', 'Gagal memperbarui urutan pelajaran');
      fetchCurriculumData();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-500">
          <svg className="h-6 w-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span className="font-medium text-slate-700">Memuat kurikulum kursus...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">{errorMsg}</p>
        <Link
          href="/cms/courses"
          className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Kembali ke Daftar Kursus
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium shadow-xl transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header & Back Link */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/cms/courses"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-blue-600"
            >
              &larr; Kembali ke Daftar Kursus
            </Link>
          </div>
          <div className="mt-1 flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900">{course?.title}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                course?.isPublished
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {course?.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Kelola modul dan materi pelajaran (Curriculum Builder)
          </p>
        </div>

        <button
          onClick={() => handleOpenModuleModal()}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Modul Baru
        </button>
      </div>

      {/* Modules List Accordion */}
      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Belum Ada Modul</h3>
          <p className="mt-1 text-sm text-slate-500">
            Kursus ini belum memiliki modul pembelajaran. Mulai dengan membuat modul pertama.
          </p>
          <button
            onClick={() => handleOpenModuleModal()}
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Tambah Modul Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, index) => {
            const isExpanded = expandedModules[mod.id] ?? false;
            return (
              <div
                key={mod.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
              >
                {/* Module Header */}
                <div className="flex flex-col space-y-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleModuleExpand(mod.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <svg
                        className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          Modul {index + 1}
                        </span>
                        <h2 className="text-base font-bold text-slate-900">{mod.title}</h2>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            mod.isPublished
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {mod.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {mod.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{mod.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Module Action Controls */}
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {/* Move Up / Down */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                      <button
                        onClick={() => handleMoveModule(index, 'up')}
                        disabled={index === 0}
                        title="Geser Naik"
                        className="p-1.5 text-slate-600 hover:text-blue-600 disabled:opacity-30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <span className="border-r border-slate-200 h-4"></span>
                      <button
                        onClick={() => handleMoveModule(index, 'down')}
                        disabled={index === modules.length - 1}
                        title="Geser Turun"
                        className="p-1.5 text-slate-600 hover:text-blue-600 disabled:opacity-30"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Publish Toggle */}
                    <button
                      onClick={() => handleTogglePublishModule(mod)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        mod.isPublished
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {mod.isPublished ? 'Unpublish' : 'Publish'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenModuleModal(mod)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteModule(mod.id)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>

                    {/* Add Lesson button */}
                    <button
                      onClick={() => handleOpenLessonModal(mod.id)}
                      className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                    >
                      + Pelajaran
                    </button>
                  </div>
                </div>

                {/* Lessons Content Accordion */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    {mod.lessons.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs text-slate-500">
                          Belum ada pelajaran di modul ini.
                        </p>
                        <button
                          onClick={() => handleOpenLessonModal(mod.id)}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          + Tambah Pelajaran Pertama
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mod.lessons.map((les, lesIdx) => (
                          <div
                            key={les.id}
                            className="flex flex-col space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {lesIdx + 1}
                              </span>

                              <div>
                                <div className="flex items-center space-x-2">
                                  <h3 className="text-sm font-semibold text-slate-800">
                                    {les.title}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                      les.isPublished
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {les.isPublished ? 'Published' : 'Draft'}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center space-x-3 text-xs text-slate-500">
                                  <span>YouTube ID: <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700 font-mono text-[11px]">{les.youtubeVideoId}</code></span>
                                  {les.speakingPrompt && (
                                    <span className="inline-flex items-center text-indigo-600">
                                      <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                      </svg>
                                      Speaking Prompt
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Lesson Action Controls */}
                            <div className="flex items-center space-x-1.5">
                              {/* Move Up / Down */}
                              <div className="flex items-center rounded border border-slate-200 bg-slate-50">
                                <button
                                  onClick={() => handleMoveLesson(mod.id, lesIdx, 'up')}
                                  disabled={lesIdx === 0}
                                  title="Geser Naik"
                                  className="p-1 text-slate-600 hover:text-blue-600 disabled:opacity-30"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <span className="border-r border-slate-200 h-3"></span>
                                <button
                                  onClick={() => handleMoveLesson(mod.id, lesIdx, 'down')}
                                  disabled={lesIdx === mod.lessons.length - 1}
                                  title="Geser Turun"
                                  className="p-1 text-slate-600 hover:text-blue-600 disabled:opacity-30"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>

                              {/* Toggle Publish */}
                              <button
                                onClick={() => handleTogglePublishLesson(les)}
                                className={`rounded px-2 py-0.5 text-xs font-semibold transition ${
                                  les.isPublished
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}
                              >
                                {les.isPublished ? 'Unpublish' : 'Publish'}
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleOpenLessonModal(mod.id, les)}
                                className="rounded border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteLesson(les.id)}
                                className="rounded border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Module Modal (Create / Edit) */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {editingModule ? 'Edit Modul' : 'Tambah Modul Baru'}
            </h2>

            <form onSubmit={handleSaveModule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Judul Modul</label>
                <input
                  type="text"
                  required
                  value={moduleForm.title}
                  onChange={(e) => handleModuleTitleChange(e.target.value)}
                  placeholder="Contoh: Mindset & Fondasi Keberanian"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Slug Modul</label>
                  <label className="flex items-center space-x-1 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={isAutoSlugModule}
                      onChange={(e) => setIsAutoSlugModule(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Auto-slug</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={moduleForm.slug}
                  onChange={(e) => {
                    setIsAutoSlugModule(false);
                    setModuleForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Deskripsi Ringkas</label>
                <textarea
                  rows={2}
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi singkat mengenai fokus modul ini..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="moduleIsPublished"
                  checked={moduleForm.isPublished}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="moduleIsPublished" className="text-sm font-medium text-slate-700">
                  Publikasikan langsung (Published)
                </label>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModuleModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Modul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal (Create / Edit) */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {editingLesson ? 'Edit Pelajaran' : 'Tambah Pelajaran Baru'}
            </h2>

            <form onSubmit={handleSaveLesson} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Judul Pelajaran</label>
                <input
                  type="text"
                  required
                  value={lessonForm.title}
                  onChange={(e) => handleLessonTitleChange(e.target.value)}
                  placeholder="Contoh: Menghancurkan Rasa Takut Berbahasa Inggris"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Slug Pelajaran</label>
                  <label className="flex items-center space-x-1 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={isAutoSlugLesson}
                      onChange={(e) => setIsAutoSlugLesson(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Auto-slug</span>
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={lessonForm.slug}
                  onChange={(e) => {
                    setIsAutoSlugLesson(false);
                    setLessonForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  ID / Link Full Video YouTube
                </label>
                <input
                  type="text"
                  required
                  value={lessonForm.youtubeVideoId}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, youtubeVideoId: e.target.value }))}
                  placeholder="Contoh: dQw4w9WgXcQ atau https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Sistem akan menguji dan mengonversi URL YouTube secara otomatis menjadi 11-karakter Video ID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Ringkasan Materi (Summary Content)</label>
                <textarea
                  rows={3}
                  value={lessonForm.summaryContent}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, summaryContent: e.target.value }))}
                  placeholder="Tuliskan ringkasan materi pelajaran untuk dibaca oleh siswa..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Speaking Practice Prompt (Opsional)</label>
                <textarea
                  rows={2}
                  value={lessonForm.speakingPrompt}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, speakingPrompt: e.target.value }))}
                  placeholder="Petunjuk instruksi latihan berbicara (Phase 4 / Phase 5)..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="lessonIsPublished"
                  checked={lessonForm.isPublished}
                  onChange={(e) => setLessonForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="lessonIsPublished" className="text-sm font-medium text-slate-700">
                  Publikasikan langsung (Published)
                </label>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pelajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
