'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  initialVideoCompleted?: boolean;
  onCompleted?: () => void;
}

export function YouTubePlayer({
  videoId,
  lessonId,
  courseSlug,
  lessonSlug,
  initialVideoCompleted = false,
  onCompleted,
}: YouTubePlayerProps) {
  const [isCompleted, setIsCompleted] = useState(initialVideoCompleted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);

  const playerRef = useRef<any>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef<boolean>(initialVideoCompleted);
  const containerId = `yt-player-${lessonId}`;

  const triggerCompletion = useCallback(async () => {
    if (hasTriggeredRef.current || isSubmitting) return;
    hasTriggeredRef.current = true;
    setIsSubmitting(true);

    try {
      let playbackSeconds = 0;
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        playbackSeconds = playerRef.current.getCurrentTime();
      }

      const res = await fetch(
        `/api/v1/courses/${courseSlug}/lessons/${lessonSlug}/video-complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playback_seconds: playbackSeconds,
          }),
        }
      );

      if (res.ok) {
        setIsCompleted(true);
        if (onCompleted) {
          onCompleted();
        }
      }
    } catch (err) {
      console.error('Failed to mark video completed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [courseSlug, lessonSlug, isSubmitting, onCompleted]);

  // Load YouTube IFrame API Script Once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api-script');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        setHasError(true);
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) previousReady();
      setIsApiReady(true);
    };

    // Safety timeout in case adblocker completely blocks script loading
    const loadTimeout = setTimeout(() => {
      if (!window.YT || !window.YT.Player) {
        setHasError(true);
      }
    }, 5000);

    return () => {
      clearTimeout(loadTimeout);
    };
  }, []);

  // Initialize YT.Player when API is ready
  useEffect(() => {
    if (!isApiReady || !videoId || typeof window === 'undefined' || !window.YT) return;

    let isMounted = true;

    try {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!isMounted) return;
            setHasError(false);
          },
          onError: () => {
            if (!isMounted) return;
            setHasError(true);
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;

            // Trigger 1: ENDED (State 0)
            if (event.data === window.YT.PlayerState.ENDED) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              triggerCompletion();
            }

            // Trigger 2: PLAYING (State 1) -> Start Polling >= 90%
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (!pollIntervalRef.current) {
                pollIntervalRef.current = setInterval(() => {
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    const currentTime = playerRef.current.getCurrentTime();
                    const duration = playerRef.current.getDuration();

                    if (duration > 0 && currentTime / duration >= 0.9) {
                      if (pollIntervalRef.current) {
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                      }
                      triggerCompletion();
                    }
                  }
                }, 1000);
              }
            }

            // PAUSED or other states -> Pause Polling
            if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.BUFFERING
            ) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
            }
          },
        },
      });
    } catch (err) {
      console.error('Error creating YouTube player instance:', err);
      setHasError(true);
    }

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [isApiReady, videoId, containerId, triggerCompletion]);

  return (
    <div className="space-y-3">
      {/* Video Player Box */}
      <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-sm aspect-video relative border border-slate-800 flex items-center justify-center">
        <div id={containerId} className="w-full h-full" />

        {hasError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-white">Video Tidak Dapat Dimuat Langsung</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pemutar YouTube IFrame terhambat oleh ad-blocker atau restriksi browser. Anda dapat menonton di tab baru atau mengonfirmasi tontonan secara manual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Buka di YouTube ↗
              </a>
              {!isCompleted && (
                <button
                  onClick={triggerCompletion}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Tandai Video Selesai ✓'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Completion Status Bar */}
      <div className="flex items-center justify-between px-1">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <span>✓</span> Video Selesai Ditonton
          </span>
        ) : (
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Tonton video minimal 90% atau hingga selesai untuk menandai progres.
          </span>
        )}

        {isSubmitting && (
          <span className="text-xs text-indigo-600 font-medium animate-pulse">
            Menyimpan progres...
          </span>
        )}
      </div>
    </div>
  );
}
