'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useAudioRecorder, formatDuration } from '@/hooks/useAudioRecorder';

interface SpeakingPracticeSectionProps {
  speakingPrompt: string;
  lessonTitle?: string;
  courseSlug?: string;
  lessonSlug?: string;
}

export function SpeakingPracticeSection({
  speakingPrompt,
  lessonTitle,
}: SpeakingPracticeSectionProps) {
  const {
    status,
    isRecording,
    audioUrl,
    duration,
    formattedDuration,
    maxDuration,
    errorMessage,
    selectedMimeType,
    startRecording,
    stopRecording,
    retakeRecording,
  } = useAudioRecorder({
    maxDurationSeconds: 120,
  });

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Synchronize custom play/pause state with native audio element events
  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const percentageUsed = Math.min(100, Math.round((duration / maxDuration) * 100));

  return (
    <section
      aria-label="Speaking Practice"
      className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden space-y-0"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white">
              <Mic className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Phase 4 • In-Browser Practice
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
            🗣️ Local Speaking Practice & Shadowing
          </h3>
        </div>

        {/* Zero-Storage Privacy Guarantee Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-900/40 border border-white/20 text-indigo-100 text-xs font-medium self-start sm:self-auto backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>100% Privat & Zero Cloud Storage</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Speaking Scenario & Guidance Prompt */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Skenario Percakapan & Panduan Latihan
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Fokus pada kelancaran (*Fluency over Perfection*)
            </span>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm leading-relaxed text-slate-800 font-medium whitespace-pre-line shadow-xs">
            {speakingPrompt}
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100/80">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-normal">
              <strong>Instruksi:</strong> Baca teks di atas dengan lantang. Tekan tombol{' '}
              <span className="font-semibold text-indigo-700">Mulai Rekam</span> untuk merekam suara Anda, lalu putar kembali untuk mengevaluasi intonasi dan kepercayaan diri Anda secara mandiri.
            </p>
          </div>
        </div>

        {/* Error / Permission Denied Non-Blocking Banner */}
        {(status === 'denied' || status === 'unsupported' || status === 'error') && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5 sm:mt-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold">
                  {status === 'denied'
                    ? 'Izin Akses Mikrofon Diperlukan'
                    : status === 'unsupported'
                    ? 'Perekaman Tidak Didukung Browser'
                    : 'Kendala Mikrofon Terdeteksi'}
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {errorMessage ||
                    'Fitur latihan rekam suara membutuhkan izin mikrofon browser Anda.'}
                  <span className="block mt-1 text-amber-700 font-medium">
                    (Catatan: Anda tetap dapat membaca skenario dan melanjutkan ke Checkpoint Quiz tanpa terblokir).
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startRecording}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0 self-end sm:self-auto"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Dynamic Recording State Controller */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 text-center space-y-5">
          {/* State 1: IDLE */}
          {status === 'idle' && (
            <div className="py-4 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner ring-8 ring-indigo-50">
                <Mic className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Siap untuk Berlatih Berbicara?
                </h4>
                <p className="text-xs text-slate-500">
                  Tekan tombol di bawah untuk meminta izin mikrofon dan memulai perekaman lokal (Batas maks: 120 detik).
                </p>
              </div>

              <button
                type="button"
                onClick={startRecording}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <Mic className="w-4 h-4 animate-bounce" />
                <span>Mulai Rekam Suara</span>
              </button>
            </div>
          )}

          {/* State 2: RECORDING */}
          {status === 'recording' && (
            <div className="py-4 space-y-5 max-w-lg mx-auto">
              {/* Active Recording Wave Animation */}
              <div className="flex items-center justify-center gap-1.5 h-12">
                <span className="w-1.5 bg-rose-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-4" />
                <span className="w-1.5 bg-rose-600 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-8" />
                <span className="w-1.5 bg-rose-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-12" />
                <span className="w-1.5 bg-rose-600 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-7" />
                <span className="w-1.5 bg-rose-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-10" />
                <span className="w-1.5 bg-rose-600 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-4" />
              </div>

              {/* Timer & Limits */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>SEDANG MEREKAM SUARA</span>
                </div>

                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                  {formattedDuration}{' '}
                  <span className="text-sm font-semibold text-slate-400">
                    / {formatDuration(maxDuration)}
                  </span>
                </div>

                {/* Progress Bar towards 120s Auto-stop */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      percentageUsed > 80
                        ? 'bg-rose-600'
                        : percentageUsed > 50
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${percentageUsed}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Perekaman otomatis berhenti pada detik ke-120 demi performa memori.
                </p>
              </div>

              {/* Stop Button */}
              <button
                type="button"
                onClick={stopRecording}
                className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Hentikan Rekam</span>
              </button>
            </div>
          )}

          {/* State 3: RECORDED (Audio Playback & Retake) */}
          {status === 'recorded' && audioUrl && (
            <div className="py-3 space-y-5 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Rekaman Selesai ({formattedDuration})</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-900">
                  Dengarkan Kembali Suara Anda
                </h4>
                <p className="text-xs text-slate-500">
                  Audio disimpan secara aman di memori browser Anda (Codec:{' '}
                  <code className="text-indigo-600 font-mono text-[10px] bg-indigo-50 px-1 py-0.5 rounded">
                    {selectedMimeType || 'audio/webm'}
                  </code>
                  ).
                </p>
              </div>

              {/* HTML5 Native Audio Player (Cross-Browser Reliable) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    Pemutar Audio Lokal
                  </span>
                  <span>Durasi: {formattedDuration}</span>
                </div>

                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  controls
                  className="w-full h-10 rounded-lg focus:outline-hidden"
                  preload="auto"
                >
                  Browser Anda tidak mendukung elemen pemutar audio HTML5.
                </audio>
              </div>

              {/* Action Buttons: Retake */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={retakeRecording}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rekam Ulang (Retake)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Zero-Storage: Rekaman dihapus otomatis dari memori saat Anda berpindah halaman.
          </span>
          <span className="text-slate-400 text-[11px]">
            PRD-04 Speaking Engine • Dream Academy
          </span>
        </div>
      </div>
    </section>
  );
}
