'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  for (const type of candidateTypes) {
    if (
      typeof MediaRecorder.isTypeSupported === 'function' &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }

  return '';
}

interface SpeakingRecorderProps {
  promptText: string;
}

export function SpeakingRecorder({ promptText }: SpeakingRecorderProps) {
  const [recordingState, setRecordingState] = useState<
    'idle' | 'requesting' | 'recording' | 'recorded' | 'error'
  >('idle');
  const [duration, setDuration] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const stopHardwareTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
      }
    }

    stopHardwareTracks();
  }, [stopHardwareTracks]);

  const startRecording = async () => {
    // Revoke previous blob url if exists
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }

    setRecordingState('requesting');
    setErrorMessage(null);
    setDuration(0);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordingState('error');
      setErrorMessage(
        'Peramban Anda tidak mendukung perekaman audio lokal (MediaDevices API).'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const mimeType = getSupportedAudioMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (!isMountedRef.current) {
          return;
        }
        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setRecordingState('recorded');
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');

      // Start duration timer (auto-stop at 120 seconds)
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 119) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      stopHardwareTracks();
      setRecordingState('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Izin mikrofon tidak diberikan. Anda tetap dapat membaca panduan prompt dan berlatih berbicara secara mandiri.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('Perangkat mikrofon tidak terdeteksi pada sistem Anda.');
      } else {
        setErrorMessage(
          err.message || 'Terjadi kesalahan saat memulai perekaman audio.'
        );
      }
    }
  };

  const retakeRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopHardwareTracks();

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }

    setDuration(0);
    setRecordingState('idle');
    setErrorMessage(null);
  };

  // Cleanup on unmount or navigation
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopHardwareTracks();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [stopHardwareTracks]);

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 rounded-2xl border border-indigo-200 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-base">
          <span className="text-lg">🗣️</span>
          <span>Panduan Speaking Practice</span>
        </div>
        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-700">
          In-Browser RAM
        </span>
      </div>

      {/* Speaking Prompt Text */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Ucapkan teks berikut dengan lantang:
        </p>
        <div className="text-sm sm:text-base font-semibold text-slate-800 bg-white p-4 sm:p-5 rounded-xl border border-indigo-100/80 shadow-sm leading-relaxed whitespace-pre-line">
          {promptText}
        </div>
      </div>

      {/* Error / Permission Denied Banner */}
      {recordingState === 'error' && errorMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
            <span>⚠️</span>
            <span>Informasi Mikrofon</span>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => {
              setRecordingState('idle');
              setErrorMessage(null);
            }}
            className="text-xs text-amber-800 font-semibold underline hover:text-amber-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Interactive Recording Controls */}
      <div className="space-y-4 pt-1">
        {recordingState === 'idle' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all transform active:scale-95"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
              <span>Mulai Rekam Suara</span>
            </button>
            <span className="text-xs text-slate-500">
              Maksimal durasi: 2 menit (120 detik)
            </span>
          </div>
        )}

        {recordingState === 'requesting' && (
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-100 text-xs text-slate-600">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Meminta izin akses mikrofon di peramban Anda...</span>
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="p-4 bg-white rounded-xl border border-red-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span>Sedang Merekam Suara...</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                {formatSeconds(duration)} / 02:00
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${(duration / 120) * 100}%` }}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>⏹</span>
                <span>Selesai Rekam</span>
              </button>
            </div>
          </div>
        )}

        {recordingState === 'recorded' && audioUrl && (
          <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span>✓</span>
                <span>Rekaman Selesai ({formatSeconds(duration)})</span>
              </div>
              <span className="text-[11px] text-slate-400">Tersimpan di RAM lokal</span>
            </div>

            {/* Native HTML5 Audio Player Controls */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
              <audio controls src={audioUrl} className="w-full h-10" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-500 italic">
                Dengarkan rekaman Anda untuk mengevaluasi intonasi & pelafalan.
              </p>
              <button
                onClick={retakeRecording}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
              >
                <span>🔄</span>
                <span>Rekam Ulang</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Guarantee Footer */}
      <div className="pt-2 border-t border-indigo-100/60 flex items-center gap-1.5 text-[11px] text-slate-500">
        <span>🔒</span>
        <span>
          <strong>100% Privat:</strong> Suara Anda hanya diproses di memori browser (RAM) dan tidak pernah diunggah ke server.
        </span>
      </div>
    </div>
  );
}
