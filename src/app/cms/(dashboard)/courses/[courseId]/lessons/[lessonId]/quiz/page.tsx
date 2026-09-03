'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface OptionItem {
  id: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

interface QuestionItem {
  id: string;
  questionText: string;
  explanation: string | null;
  orderIndex: number;
  options: OptionItem[];
}

interface QuizDetail {
  id: string;
  lessonId: string;
  title: string;
  passingScore: number;
  questions: QuestionItem[];
  _count?: {
    attempts: number;
  };
}

export default function CmsQuizBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [lessonTitle, setLessonTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quiz Form State
  const [quizForm, setQuizForm] = useState({
    title: '',
    passingScore: 70,
  });

  // Question Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    explanation: '',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchQuizData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Lesson Detail for header
      const lessonRes = await fetch(`/api/v1/admin/lessons/${lessonId}`);
      if (lessonRes.status === 401) {
        router.push('/cms/login');
        return;
      }
      if (lessonRes.status === 403) {
        setErrorMsg('Akses ditolak. Anda tidak memiliki izin Admin.');
        setLoading(false);
        return;
      }
      const lessonJson = await lessonRes.json();
      if (lessonJson.success) {
        setLessonTitle(lessonJson.data.title);
      }

      // 2. Fetch Admin Quiz
      const quizRes = await fetch(`/api/v1/admin/lessons/${lessonId}/quiz`);
      const quizJson = await quizRes.json();
      if (quizJson.success && quizJson.data) {
        setQuiz(quizJson.data);
        setQuizForm({
          title: quizJson.data.title,
          passingScore: quizJson.data.passingScore,
        });
      } else {
        setQuiz(null);
        setQuizForm({
          title: lessonJson.success ? `Kuis Checkpoint: ${lessonJson.data.title}` : 'Kuis Checkpoint',
          passingScore: 70,
        });
      }
    } catch (err: any) {
      console.error('Error fetching quiz data:', err);
      setErrorMsg('Gagal memuat data kuis');
    } finally {
      setLoading(false);
    }
  }, [lessonId, router]);

  useEffect(() => {
    if (lessonId) {
      fetchQuizData();
    }
  }, [lessonId, fetchQuizData]);

  // Create or Update Quiz Metadata
  const handleSaveQuizMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (quiz) {
        // Update existing quiz
        const res = await fetch(`/api/v1/admin/quizzes/${quiz.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quizForm),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast('error', json.error || 'Gagal memperbarui kuis');
          setIsSubmitting(false);
          return;
        }
        showToast('success', 'Pengaturan kuis berhasil diperbarui');
      } else {
        // Create new quiz
        const res = await fetch(`/api/v1/admin/lessons/${lessonId}/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quizForm),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast('error', json.error || 'Gagal membuat kuis');
          setIsSubmitting(false);
          return;
        }
        showToast('success', 'Kuis baru berhasil dibuat');
      }
      fetchQuizData();
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menyimpan kuis');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async () => {
    if (!quiz) return;
    if (!confirm('Apakah Anda yakin ingin menghapus kuis ini?')) return;

    try {
      const res = await fetch(`/api/v1/admin/quizzes/${quiz.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menghapus kuis');
        return;
      }
      showToast('success', 'Kuis berhasil dihapus');
      fetchQuizData();
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menghapus kuis');
    }
  };

  // Open Question Modal
  const handleOpenQuestionModal = (questionToEdit?: QuestionItem) => {
    if (questionToEdit) {
      setEditingQuestion(questionToEdit);
      setQuestionForm({
        questionText: questionToEdit.questionText,
        explanation: questionToEdit.explanation || '',
        options: questionToEdit.options.map((o) => ({
          optionText: o.optionText,
          isCorrect: o.isCorrect,
        })),
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        questionText: '',
        explanation: '',
        options: [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
        ],
      });
    }
    setIsQuestionModalOpen(true);
  };

  const handleOptionChange = (index: number, text: string) => {
    setQuestionForm((prev) => {
      const newOpts = [...prev.options];
      newOpts[index].optionText = text;
      return { ...prev, options: newOpts };
    });
  };

  const handleCorrectOptionSelect = (index: number) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      })),
    }));
  };

  const handleAddOptionField = () => {
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { optionText: '', isCorrect: false }],
    }));
  };

  const handleRemoveOptionField = (index: number) => {
    if (questionForm.options.length <= 2) {
      showToast('error', 'Minimal harus ada 2 pilihan jawaban');
      return;
    }
    setQuestionForm((prev) => {
      const isRemovingCorrect = prev.options[index].isCorrect;
      const newOpts = prev.options.filter((_, i) => i !== index);
      if (isRemovingCorrect && newOpts.length > 0) {
        newOpts[0].isCorrect = true;
      }
      return { ...prev, options: newOpts };
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) {
      showToast('error', 'Buat kuis terlebih dahulu sebelum menambah soal');
      return;
    }

    // Validate options non-empty
    const validOpts = questionForm.options.filter((o) => o.optionText.trim() !== '');
    if (validOpts.length < 2) {
      showToast('error', 'Minimal harus memasukkan 2 pilihan jawaban yang valid');
      return;
    }

    const correctCount = validOpts.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      showToast('error', 'Pilih tepat 1 jawaban yang benar');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingQuestion
        ? `/api/v1/admin/questions/${editingQuestion.id}`
        : `/api/v1/admin/quizzes/${quiz.id}/questions`;
      const method = editingQuestion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: questionForm.questionText,
          explanation: questionForm.explanation || null,
          options: validOpts,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menyimpan soal');
        setIsSubmitting(false);
        return;
      }

      showToast('success', editingQuestion ? 'Soal berhasil diperbarui' : 'Soal baru berhasil ditambahkan');
      setIsQuestionModalOpen(false);
      fetchQuizData();
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menyimpan soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;

    try {
      const res = await fetch(`/api/v1/admin/questions/${questionId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal menghapus soal');
        return;
      }
      showToast('success', 'Soal berhasil dihapus');
      fetchQuizData();
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat menghapus soal');
    }
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    if (!quiz) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quiz.questions.length) return;

    const newQuestions = [...quiz.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    const questionIds = newQuestions.map((q) => q.id);

    // Optimistic UI
    setQuiz({ ...quiz, questions: newQuestions });

    try {
      const res = await fetch(`/api/v1/admin/quizzes/${quiz.id}/questions/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Gagal memperbarui urutan soal');
        fetchQuizData();
      } else {
        showToast('success', 'Urutan soal berhasil diperbarui');
      }
    } catch (err) {
      showToast('error', 'Gagal memperbarui urutan soal');
      fetchQuizData();
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
          <span className="font-medium text-slate-700">Memuat Quiz Builder...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">{errorMsg}</p>
        <Link
          href={`/cms/courses/${courseId}`}
          className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Kembali ke Kurikulum
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
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header & Back Link */}
      <div>
        <Link
          href={`/cms/courses/${courseId}`}
          className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-blue-600"
        >
          &larr; Kembali ke Kurikulum
        </Link>
        <div className="mt-1 flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-slate-900">Quiz Builder</h1>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            {lessonTitle}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Kelola kuis checkpoint, passing score, soal pilihan ganda, dan kunci jawaban.
        </p>
      </div>

      {/* Quiz Metadata Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Pengaturan Kuis</h2>
        <form onSubmit={handleSaveQuizMetadata} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Judul Kuis</label>
              <input
                type="text"
                required
                value={quizForm.title}
                onChange={(e) => setQuizForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Contoh: Kuis Checkpoint: Mindset & Fondasi Keberanian"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Passing Score (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={quizForm.passingScore}
                onChange={(e) => setQuizForm((prev) => ({ ...prev, passingScore: parseInt(e.target.value) || 70 }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {quiz && quiz._count && quiz._count.attempts > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="font-semibold">Perhatian:</span> Kuis ini telah dikerjakan oleh {quiz._count.attempts} siswa. Fitur hapus kuis dikunci untuk menjaga integritas histori pengerjaan siswa.
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              {quiz && (
                <button
                  type="button"
                  onClick={handleDeleteQuiz}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Hapus Kuis
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : quiz ? 'Simpan Pengaturan' : 'Buat Kuis Baru'}
            </button>
          </div>
        </form>
      </div>

      {/* Questions Section */}
      {quiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Daftar Soal ({quiz.questions.length})</h2>
            <button
              onClick={() => handleOpenQuestionModal()}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Tambah Soal Baru
            </button>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">Belum ada soal pada kuis ini.</p>
              <button
                onClick={() => handleOpenQuestionModal()}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
              >
                + Tambah Soal Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {quiz.questions.map((q, qIdx) => (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {qIdx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{q.questionText}</h3>
                        {q.explanation && (
                          <p className="mt-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">Penjelasan:</span> {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Reorder Buttons */}
                      <div className="flex items-center rounded border border-slate-200 bg-slate-50">
                        <button
                          onClick={() => handleMoveQuestion(qIdx, 'up')}
                          disabled={qIdx === 0}
                          title="Geser Naik"
                          className="p-1 text-slate-600 hover:text-blue-600 disabled:opacity-30"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <span className="border-r border-slate-200 h-3"></span>
                        <button
                          onClick={() => handleMoveQuestion(qIdx, 'down')}
                          disabled={qIdx === quiz.questions.length - 1}
                          title="Geser Turun"
                          className="p-1 text-slate-600 hover:text-blue-600 disabled:opacity-30"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenQuestionModal(q)}
                        className="rounded border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="rounded border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`flex items-center space-x-2 rounded-lg border p-2.5 text-xs font-medium ${
                          opt.isCorrect
                            ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                            opt.isCorrect
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'border border-slate-400 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="flex-1">{opt.optionText}</span>
                        {opt.isCorrect && (
                          <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                            Kunci Jawaban
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question Modal (Create / Edit) */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {editingQuestion ? 'Edit Soal Kuis' : 'Tambah Soal Kuis Baru'}
            </h2>

            <form onSubmit={handleSaveQuestion} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Teks Pertanyaan</label>
                <textarea
                  rows={3}
                  required
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, questionText: e.target.value }))}
                  placeholder="Tuliskan pertanyaan kuis di sini..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Penjelasan / Pembahasan (Opsional)</label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Penjelasan mengapa jawaban tersebut benar..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Pilihan Jawaban & Kunci</label>
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    + Tambah Opsi
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={() => handleCorrectOptionSelect(idx)}
                        title="Pilih sebagai jawaban yang benar"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        required
                        value={opt.optionText}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                        className={`flex-1 rounded-lg border px-3 py-1.5 text-sm text-slate-900 focus:outline-none ${
                          opt.isCorrect
                            ? 'border-emerald-400 bg-emerald-50/50 focus:border-emerald-600'
                            : 'border-slate-300 focus:border-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionField(idx)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Hapus pilihan ini"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Pilih salah satu tombol radio di sebelah kiri untuk menandai Kunci Jawaban yang Benar.
                </p>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
