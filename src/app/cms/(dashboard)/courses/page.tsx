'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface CourseItem {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    modules: number;
    enrollments: number;
  };
}

export default function CmsCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // Status & Error Messages
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Delete State
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/admin/courses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCourses(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (autoSlug) {
      setSlug(slugify(newTitle));
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setIsPublished(false);
    setAutoSlug(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: CourseItem) => {
    setEditingCourse(course);
    setTitle(course.title);
    setSlug(course.slug);
    setDescription(course.description || '');
    setImageUrl(course.imageUrl || '');
    setIsPublished(course.isPublished);
    setAutoSlug(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const payload = {
        title,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        isPublished,
      };

      const url = editingCourse
        ? `/api/v1/admin/courses/${editingCourse.id}`
        : '/api/v1/admin/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || 'Gagal menyimpan data kursus');
        return;
      }

      setIsModalOpen(false);
      showToast(
        editingCourse
          ? 'Kursus berhasil diperbarui!'
          : 'Kursus baru berhasil ditambahkan!'
      );
      fetchCourses();
    } catch (err: any) {
      setFormError('Terjadi kesalahan jaringan saat menyimpan data');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTogglePublish = async (course: CourseItem) => {
    try {
      const res = await fetch(`/api/v1/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !course.isPublished }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          !course.isPublished
            ? `Kursus "${course.title}" berhasil dipublikasikan!`
            : `Status kursus "${course.title}" diubah ke Draft`
        );
        fetchCourses();
      } else {
        showToast(json.error || 'Gagal mengubah status publikasi');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
    try {
      const res = await fetch(`/api/v1/admin/courses/${courseId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (res.ok && json.success) {
        showToast('Kursus berhasil dihapus');
        fetchCourses();
      } else {
        alert(json.error || 'Gagal menghapus kursus');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setDeletingCourseId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg border border-slate-800 flex items-center gap-2">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Kursus (Courses)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola katalog kursus, judul, deskripsi, slug, dan status publikasi (Draft / Published).
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          type="button"
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
        >
          + Tambah Kursus Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari berdasarkan judul, slug, atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">Semua Status</option>
            <option value="published">Published Only</option>
            <option value="draft">Draft Only</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
            Memuat daftar kursus...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-3xl">📚</div>
            <div className="text-slate-700 font-semibold">Belum Ada Kursus</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'Tidak ada kursus yang cocok dengan kata kunci atau filter terpilih.'
                : 'Klik tombol "+ Tambah Kursus Baru" di atas untuk menambahkan kursus pertama.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Kursus & Slug</th>
                  <th className="px-6 py-3.5">Struktur & Siswa</th>
                  <th className="px-6 py-3.5">Status Publikasi</th>
                  <th className="px-6 py-3.5">Tanggal Buat</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{course.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">/{course.slug}</div>
                      {course.description && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-xs">
                          {course.description}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-700">
                        {course._count.modules} Modul
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {course._count.enrollments} Siswa Terdaftar
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(course)}
                        title="Klik untuk mengubah status publikasi"
                        type="button"
                        className="inline-flex items-center gap-1.5 focus:outline-hidden"
                      >
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full border transition-all ${
                            course.isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {course.isPublished ? '● PUBLISHED' : '○ DRAFT'}
                        </span>
                      </button>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(course.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(course)}
                        type="button"
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Apakah Anda yakin ingin menghapus kursus "${course.title}"?`
                            )
                          ) {
                            handleDeleteCourse(course.id);
                          }
                        }}
                        disabled={deletingCourseId === course.id}
                        type="button"
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                      >
                        {deletingCourseId === course.id ? 'Menghapus...' : 'Hapus'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingCourse ? 'Edit Data Kursus' : 'Tambah Kursus Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Kursus *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bahasa Inggris Bisnis"
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Slug Rute (URL) *
                  </label>
                  {!editingCourse && (
                    <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSlug}
                        onChange={(e) => setAutoSlug(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      Auto-generate
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="misal: bahasa-inggris-bisnis"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setAutoSlug(false);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Alamat unik rute di web: /courses/{slug || '...'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Kursus
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan singkat mengenai materi kursus ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Gambar Cover (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Publikasikan Langsung ke Katalog Siswa (Published)
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 ml-6 mt-0.5">
                  Jika tidak dicentang, kursus akan disimpan sebagai Draft dan hanya terlihat di CMS.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Memproses...' : 'Simpan Kursus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
