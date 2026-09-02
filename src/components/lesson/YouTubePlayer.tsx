'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, Play, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            rel?: 0 | 1;
            modestbranding?: 0 | 1;
            origin?: string;
            enablejsapi?: 0 | 1;
          };
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number; target: any }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => any;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  lessonId: string;
  videoId: string;
  initialCompleted?: boolean;
  courseSlug?: string;
  lessonSlug?: string;
  onCompletionChange?: (isCompleted: boolean) => void;
}

export function YouTubePlayer({
  lessonId,
  videoId,
  initialCompleted = false,
  courseSlug,
  lessonSlug,
  onCompletionChange,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(initialCompleted);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [secondsPlayed, setSecondsPlayed] = useState(0);

  // Sync state if initialCompleted changes
  useEffect(() => {
    if (initialCompleted) {
      setVideoCompleted(true);
    }
  }, [initialCompleted]);

  // Handle Video Completion API call (Idempotent)
  const markCompletion = useCallback(
    async (playbackSeconds?: number) => {
      if (videoCompleted || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const endpoint =
          courseSlug && lessonSlug
            ? `/api/v1/courses/${courseSlug}/lessons/${lessonSlug}/video-complete`
            : `/api/v1/lessons/${lessonId}/video-complete`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playback_seconds: playbackSeconds ? Math.round(playbackSeconds) : undefined,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setVideoCompleted(true);
            if (onCompletionChange) {
              onCompletionChange(true);
            }
          }
        } else {
          console.warn('Failed to mark video completed:', await res.text());
        }
      } catch (err) {
        console.error('Error marking video completion:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [videoCompleted, isSubmitting, courseSlug, lessonSlug, lessonId, onCompletionChange]
  );

  // Load YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        if (isMounted) setHasError(true);
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      if (isMounted) {
        setIsApiLoaded(true);
      }
    };

    // Timeout fallback: if YT API takes more than 8 seconds to load (adblocker/network issue)
    const timeoutTimer = setTimeout(() => {
      if (isMounted && !window.YT?.Player) {
        setHasError(true);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
  }, []);

  // Initialize YouTube Player once API is loaded
  useEffect(() => {
    if (!isApiLoaded || !containerRef.current || playerRef.current) return;

    const playerId = `yt-player-${lessonId}`;
    containerRef.current.innerHTML = `<div id="${playerId}" class="w-full h-full"></div>`;

    try {
      playerRef.current = new window.YT!.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true);
          },
          onStateChange: (event) => {
            const playerState = event.data;

            // Clear previous interval if any
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Case 1: Video Ended (YT.PlayerState.ENDED = 0)
            if (playerState === 0) {
              const duration = playerRef.current?.getDuration?.() || 0;
              setProgressPercent(100);
              markCompletion(duration);
            }

            // Case 2: Video Playing (YT.PlayerState.PLAYING = 1) -> Poll progress
            if (playerState === 1) {
              pollIntervalRef.current = setInterval(() => {
                try {
                  const currentTime = playerRef.current?.getCurrentTime?.() || 0;
                  const duration = playerRef.current?.getDuration?.() || 0;

                  if (duration > 0) {
                    const pct = Math.min(100, Math.round((currentTime / duration) * 100));
                    setProgressPercent(pct);
                    setSecondsPlayed(Math.round(currentTime));

                    // Completion trigger: watch progress >= 90%
                    if (currentTime / duration >= 0.9) {
                      markCompletion(currentTime);
                    }
                  }
                } catch {
                  // Ignore cross-origin / destroyed player access
                }
              }, 1000);
            }
          },
          onError: (event) => {
            console.warn('YouTube Player error code:', event.data);
            setHasError(true);
          },
        },
      });
    } catch (e) {
      console.error('Failed to create YouTube player:', e);
      setHasError(true);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {
          // Ignore destruction errors
        }
        playerRef.current = null;
      }
    };
  }, [isApiLoaded, videoId, lessonId, markCompletion]);

  return (
    <div className="space-y-3">
      {/* Video Container (16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 shadow-md border border-slate-800">
        {/* Mount container for YouTube iframe */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading Overlay */}
        {!isPlayerReady && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-3 z-10 pointer-events-none">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium text-slate-300">Memuat pemutar video...</p>
          </div>
        )}

        {/* Error Fallback Banner (Adblocker / Offline / Embed Restriction) */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 text-center space-y-4 z-20">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-slate-100">
                Pemutar Video Tidak Dapat Dimuat
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pemutar YouTube terhalang oleh ekstensi adblocker atau gangguan koneksi. Anda dapat
                membuka video langsung di YouTube atau konfirmasi manual di bawah.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Tonton di YouTube
              </a>

              <button
                type="button"
                onClick={() => markCompletion(0)}
                disabled={isSubmitting || videoCompleted}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  videoCompleted
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                }`}
              >
                {videoCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Video Telah Dikonfirmasi Selesai
                  </>
                ) : isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan Status...
                  </>
                ) : (
                  <>Konfirmasi Selesai Menonton</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playback Progress & Completion Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        {/* Watch Completion Badge */}
        <div className="flex items-center gap-2">
          {videoCompleted ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Video Selesai Ditonton</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Play className="w-3 h-3 text-slate-500" />
              <span>Tonton minimal 90% durasi untuk menyelesaikan video</span>
            </div>
          )}
        </div>

        {/* Progress % indicator (when active & not yet completed) */}
        {!videoCompleted && progressPercent > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Progres Menonton:</span>
            <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-semibold text-slate-700">{progressPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
