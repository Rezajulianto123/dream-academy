'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'recorded'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface UseAudioRecorderOptions {
  /**
   * Maximum recording time limit in seconds (default: 120 per PRD/Phase 4)
   */
  maxDurationSeconds?: number;
  /**
   * Callback fired when recording reaches maxDurationSeconds and automatically stops
   */
  onAutoStop?: () => void;
  /**
   * Optional error callback
   */
  onError?: (error: Error) => void;
}

export interface UseAudioRecorderReturn {
  status: RecorderStatus;
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  formattedDuration: string;
  maxDuration: number;
  errorMessage: string | null;
  selectedMimeType: string | undefined;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  retakeRecording: () => void;
}

/**
 * Priority list for cross-browser MIME audio recording resolution.
 * WebM/Opus -> WebM -> MP4 (Safari) -> Ogg/Opus -> WAV
 */
export const MIME_TYPE_PRIORITIES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/wav',
];

/**
 * Resolves the best supported audio MIME type in the current client browser environment.
 */
export function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  for (const mime of MIME_TYPE_PRIORITIES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return undefined;
}

/**
 * Format seconds into mm:ss display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function useAudioRecorder({
  maxDurationSeconds = 120,
  onAutoStop,
  onError,
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Keep audioUrlRef in sync for cleanup
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const releaseMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (err) {
        console.warn('Error stopping media tracks:', err);
      }
      mediaStreamRef.current = null;
    }
  }, []);

  const revokeCurrentAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch (err) {
        console.warn('Error revoking object URL:', err);
      }
      audioUrlRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearTimer();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping media recorder:', err);
      }
    }

    // Immediately release microphone hardware track
    releaseMediaStream();
  }, [clearTimer, releaseMediaStream]);

  const startRecording = useCallback(async () => {
    // Reset any previous state and error
    setErrorMessage(null);
    clearTimer();
    revokeCurrentAudioUrl();
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);

    // 1. Verify Browser Support
    if (
      typeof window === 'undefined' ||
      !navigator?.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      const msg =
        'Fitur perekaman suara lokal tidak didukung oleh browser Anda atau berjalan di konteks non-aman (HTTPS required).';
      setStatus('unsupported');
      setErrorMessage(msg);
      if (onError) onError(new Error(msg));
      return;
    }

    // 2. Request On-Demand Microphone Access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      let friendlyMessage = 'Gagal mengakses mikrofon.';
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        friendlyMessage =
          'Izin akses mikrofon ditolak. Mohon izinkan akses mikrofon di pengaturan browser untuk merekam suara latihan.';
        setStatus('denied');
      } else if (
        err.name === 'NotFoundError' ||
        err.name === 'DevicesNotFoundError'
      ) {
        friendlyMessage =
          'Perangkat mikrofon tidak ditemukan. Pastikan mikrofon terpasang pada perangkat Anda.';
        setStatus('error');
      } else {
        friendlyMessage = err.message || 'Terjadi kesalahan pada mikrofon.';
        setStatus('error');
      }

      setErrorMessage(friendlyMessage);
      if (onError) onError(err);
      return;
    }

    // 3. Resolve Cross-Browser MIME Type
    const mime = getSupportedMimeType();
    setSelectedMimeType(mime);

    // 4. Initialize MediaRecorder instance
    let recorder: MediaRecorder;
    try {
      const options = mime ? { mimeType: mime } : undefined;
      recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
    } catch (err: any) {
      releaseMediaStream();
      const msg = 'Gagal menginisialisasi MediaRecorder dengan codec yang dipilih.';
      setStatus('error');
      setErrorMessage(msg);
      if (onError) onError(err);
      return;
    }

    audioChunksRef.current = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      clearTimer();
      releaseMediaStream();

      if (audioChunksRef.current.length > 0) {
        const resolvedType = mime || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: resolvedType });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);
        setStatus('recorded');
      } else {
        setStatus('idle');
      }
    };

    recorder.onerror = (e: any) => {
      clearTimer();
      releaseMediaStream();
      setStatus('error');
      setErrorMessage('Terjadi kesalahan saat proses perekaman audio.');
      if (onError) onError(e?.error || new Error('MediaRecorder error'));
    };

    // 5. Start Recording
    try {
      recorder.start(1000); // 1s slice for smooth chunk collection
      setStatus('recording');
      setDuration(0);

      // Start duration counter with 120s auto-stop safeguard
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSeconds) {
            stopRecording();
            if (onAutoStop) onAutoStop();
            return maxDurationSeconds;
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      releaseMediaStream();
      setStatus('error');
      setErrorMessage('Gagal memulai perekaman.');
      if (onError) onError(err);
    }
  }, [
    clearTimer,
    maxDurationSeconds,
    onAutoStop,
    onError,
    releaseMediaStream,
    revokeCurrentAudioUrl,
    stopRecording,
  ]);

  const resetRecording = useCallback(() => {
    clearTimer();
    stopRecording();
    releaseMediaStream();
    revokeCurrentAudioUrl();
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setErrorMessage(null);
    setStatus('idle');
  }, [clearTimer, releaseMediaStream, revokeCurrentAudioUrl, stopRecording]);

  const retakeRecording = useCallback(() => {
    resetRecording();
  }, [resetRecording]);

  // Comprehensive Cleanup on Component Unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      releaseMediaStream();
      revokeCurrentAudioUrl();
    };
  }, [clearTimer, releaseMediaStream, revokeCurrentAudioUrl]);

  return {
    status,
    isRecording: status === 'recording',
    audioBlob,
    audioUrl,
    duration,
    formattedDuration: formatDuration(duration),
    maxDuration: maxDurationSeconds,
    errorMessage,
    selectedMimeType,
    startRecording,
    stopRecording,
    resetRecording,
    retakeRecording,
  };
}
