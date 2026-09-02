'use client';

import React, { useState, useEffect } from 'react';

interface CheckpointQuizProps {
  quizId: string;
  courseSlug: string;
  lessonSlug: string;
  initialBestScore?: number | null;
  initialIsCompleted?: boolean;
  videoCompleted?: boolean;
}

export function CheckpointQuiz({
  quizId,
  courseSlug,
  lessonSlug,
  initialBestScore = null,
  initialIsCompleted = false,
  videoCompleted = false,
}: CheckpointQuizProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [quizData, setQuizData] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(initialBestScore);
  const [isCompleted, setIsCompleted] = useState<boolean>(initialIsCompleted);

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(
          `/api/v1/courses/${courseSlug}/lessons/${lessonSlug}/quiz`
        );
        const json = await res.json();
        if (isMounted) {
          if (json.success) {
            setQuizData(json.data);
            if (json.data.best_score !== null) {
              setBestScore(json.data.best_score);
            }
          } else {
            setErrorMessage(json.error?.message || 'Gagal memuat kuis.');
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Gagal menghubungi server untuk memuat kuis.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, lessonSlug]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizData || submitting) return;

    const answersArray = Object.entries(selectedAnswers).map(
      ([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      })
    );

    if (answersArray.length !== quizData.questions.length) {
      setErrorMessage('Mohon jawab seluruh pertanyaan sebelum mengirimkan kuis.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/v1/courses/${courseSlug}/lessons/${lessonSlug}/quiz/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersArray }),
        }
      );

      const json = await res.json();
      if (json.success) {
        setResultData(json.data);
        if (json.data.best_score !== null) {
          setBestScore(json.data.best_score);
        }
        if (json.data.lesson_completion?.is_completed) {
          setIsCompleted(true);
        }
      } else {
        setErrorMessage(json.error?.message || 'Gagal mengirimkan kuis.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan saat mengirimkan jawaban kuis.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setResultData(null);
    setErrorMessage(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Memuat Checkpoint Quiz...</p>
      </div>
    );
  }

  if (errorMessage && !quizData) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-2 text-center">
        <p className="text-xs font-bold text-rose-700">⚠️ {errorMessage}</p>
      </div>
    );
  }

  if (!quizData) return null;

  const totalQuestions = quizData.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h2 className="text-lg font-bold text-slate-900">{quizData.title}</h2>
          </div>
          <p className="text-xs text-slate-500">
            Passing Grade: <strong className="text-slate-800">{quizData.passing_score}%</strong> • {totalQuestions} Soal Pilihan Ganda
          </p>
        </div>

        {bestScore !== null && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="text-xs text-indigo-700 font-medium">Skor Terbaik:</span>
            <span className="text-sm font-bold text-indigo-900">{bestScore}%</span>
            {bestScore >= quizData.passing_score ? (
              <span className="text-[11px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">LULUS</span>
            ) : (
              <span className="text-[11px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">BELUM LULUS</span>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {errorMessage}
        </div>
      )}

      {/* QUIZ ACTIVE VIEW */}
      {!resultData && (
        <div className="space-y-6">
          {quizData.questions.map((q: any, idx: number) => {
            const isAnswered = Boolean(selectedAnswers[q.id]);
            return (
              <div
                key={q.id}
                className={`p-5 rounded-xl border transition-all ${
                  isAnswered ? 'bg-slate-50/70 border-indigo-200' : 'bg-white border-slate-200'
                } space-y-4`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                    {q.question_text}
                  </p>
                </div>

                {/* Options list */}
                <div className="grid grid-cols-1 gap-2.5 pt-1 pl-9">
                  {q.options.map((opt: any) => {
                    const isSelected = selectedAnswers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span>{opt.option_text}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-white bg-white text-indigo-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Bottom Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {answeredCount} dari {totalQuestions} pertanyaan terjawab
            </span>

            <button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={!isAllAnswered || submitting}
              className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
                isAllAnswered && !submitting
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white transform active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{submitting ? 'Mengevaluasi Kuis...' : 'Kirim Jawaban Kuis'}</span>
            </button>
          </div>
        </div>
      )}

      {/* RESULT VIEW */}
      {resultData && (
        <div className="space-y-6">
          {/* Result Card */}
          <div
            className={`p-6 rounded-2xl border ${
              resultData.is_passed
                ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
                : 'bg-gradient-to-br from-amber-50 to-white border-amber-200'
            } text-center space-y-4`}
          >
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl">
                {resultData.is_passed ? '🎉' : '💪'}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                {resultData.is_passed ? 'Selamat! Anda Lulus Kuis' : 'Belum Mencapai Nilai Kelulusan'}
              </h3>
              <p className="text-xs text-slate-600">
                {resultData.is_passed
                  ? 'Pemahaman materi Anda sudah memenuhi standar kompetensi.'
                  : `Target kelulusan adalah ${quizData.passing_score}%. Anda dapat mengulang kuis tanpa batas.`}
              </p>
            </div>

            <div className="inline-flex items-center gap-6 bg-white/90 px-6 py-3 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="text-center">
                <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">
                  Skor Percobaan
                </span>
                <span
                  className={`text-2xl font-black ${
                    resultData.is_passed ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {resultData.score}%
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <span className="text-[11px] text-slate-500 block uppercase font-bold tracking-wider">
                  Skor Tertinggi
                </span>
                <span className="text-2xl font-black text-indigo-700">
                  {resultData.best_score}%
                </span>
              </div>
            </div>

            {/* Lesson Completion Badge */}
            {resultData.lesson_completion?.is_completed ? (
              <div className="p-3 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Lesson ini Resmi COMPLETED! Progres kursus telah diperbarui.</span>
              </div>
            ) : resultData.is_passed && !resultData.lesson_completion?.video_completed ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-800">
                💡 Kuis telah Lulus! Tonton video pembelajaran hingga tuntas untuk menyelesaikan materi ini.
              </div>
            ) : null}
          </div>

          {/* Review Feedback for Each Question */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Review Pembahasan Soal
            </h4>

            {quizData.questions.map((q: any, idx: number) => {
              const fb = resultData.feedback?.find((f: any) => f.question_id === q.id);
              const isCorrect = fb?.is_correct ?? false;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-xl border ${
                    isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      >
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {idx + 1}. {q.question_text}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCorrect ? 'BENAR' : 'SALAH'}
                    </span>
                  </div>

                  {/* Options review */}
                  <div className="grid grid-cols-1 gap-1.5 pl-7 text-xs">
                    {q.options.map((opt: any) => {
                      const isUserSelected = fb?.selected_option_id === opt.id;
                      const isCorrectOption = fb?.correct_option_id === opt.id;

                      let badgeStyle = 'bg-white/80 border-slate-200 text-slate-700';
                      if (isCorrectOption) {
                        badgeStyle = 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold';
                      } else if (isUserSelected && !isCorrect) {
                        badgeStyle = 'bg-rose-100 border-rose-300 text-rose-900 line-through';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${badgeStyle}`}
                        >
                          <span>{opt.option_text}</span>
                          {isCorrectOption && (
                            <span className="text-[10px] font-bold text-emerald-700 uppercase">
                              Jawaban Benar
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation text */}
                  {fb?.explanation && (
                    <div className="pl-7 pt-1">
                      <p className="text-xs text-slate-600 bg-white/70 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                        <strong className="text-slate-800">💡 Pembahasan:</strong> {fb.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Retake action */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleRetake}
              className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>Ulangi Kuis (Retake)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
