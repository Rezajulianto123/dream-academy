import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSupportedAudioMimeType } from '@/components/speaking/SpeakingRecorder';

describe('Phase 4 Speaking Practice Unit Tests', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getSupportedAudioMimeType should return empty string when MediaRecorder is undefined (SSR safety)', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const mime = getSupportedAudioMimeType();
    expect(mime).toBe('');
  });

  it('getSupportedAudioMimeType should return first supported MIME type in priority list', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (type: string) =>
        type === 'audio/webm;codecs=opus' || type === 'audio/webm',
    });

    const mime = getSupportedAudioMimeType();
    expect(mime).toBe('audio/webm;codecs=opus');
  });

  it('getSupportedAudioMimeType should fallback to audio/mp4 if webm is not supported (Safari macOS/iOS)', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (type: string) => type === 'audio/mp4',
    });

    const mime = getSupportedAudioMimeType();
    expect(mime).toBe('audio/mp4');
  });
});
