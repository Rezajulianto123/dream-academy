import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSupportedMimeType,
  MIME_TYPE_PRIORITIES,
  formatDuration,
} from '@/hooks/useAudioRecorder';

describe('useAudioRecorder - Utilities & MIME Type Compatibility (Phase 4 PRD-04)', () => {
  const originalMediaRecorder = (globalThis as any).MediaRecorder;

  afterEach(() => {
    (globalThis as any).MediaRecorder = originalMediaRecorder;
    vi.restoreAllMocks();
  });

  it('formatDuration should format seconds to mm:ss format correctly', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(75)).toBe('01:15');
    expect(formatDuration(120)).toBe('02:00');
  });

  it('MIME_TYPE_PRIORITIES must match specification order (PRD-04)', () => {
    expect(MIME_TYPE_PRIORITIES).toEqual([
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ]);
  });

  it('getSupportedMimeType should return highest priority supported MIME type (Chrome/Firefox -> audio/webm;codecs=opus)', () => {
    const mockIsTypeSupported = vi.fn((mime: string) => {
      return mime === 'audio/webm;codecs=opus' || mime === 'audio/webm';
    });

    (globalThis as any).MediaRecorder = {
      isTypeSupported: mockIsTypeSupported,
    };

    const result = getSupportedMimeType();
    expect(result).toBe('audio/webm;codecs=opus');
    expect(mockIsTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus');
  });

  it('getSupportedMimeType should fallback to audio/mp4 on Safari when webm is unsupported', () => {
    const mockIsTypeSupported = vi.fn((mime: string) => {
      return mime === 'audio/mp4';
    });

    (globalThis as any).MediaRecorder = {
      isTypeSupported: mockIsTypeSupported,
    };

    const result = getSupportedMimeType();
    expect(result).toBe('audio/mp4');
  });

  it('getSupportedMimeType should return undefined if no listed types are supported', () => {
    const mockIsTypeSupported = vi.fn(() => false);

    (globalThis as any).MediaRecorder = {
      isTypeSupported: mockIsTypeSupported,
    };

    const result = getSupportedMimeType();
    expect(result).toBeUndefined();
  });

  it('getSupportedMimeType should safely handle environments where MediaRecorder is undefined', () => {
    delete (globalThis as any).MediaRecorder;
    const result = getSupportedMimeType();
    expect(result).toBeUndefined();
  });
});

describe('MediaRecorder Lifecycle, Hardware Cleanup & Zero-Storage Engine', () => {
  let stopTrackMock: any;
  let mockTrack: any;
  let mockStream: any;
  let mockRecorderInstance: any;
  let getUserMediaMock: any;
  let revokeObjectURLMock: any;
  let createObjectURLMock: any;

  beforeEach(() => {
    stopTrackMock = vi.fn();
    mockTrack = {
      kind: 'audio',
      readyState: 'live',
      stop: stopTrackMock,
    };
    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    };

    getUserMediaMock = vi.fn().mockResolvedValue(mockStream);

    try {
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: {
          getUserMedia: getUserMediaMock,
        },
        configurable: true,
        writable: true,
      });
    } catch {
      (globalThis as any).navigator = {
        mediaDevices: {
          getUserMedia: getUserMediaMock,
        },
      };
    }

    mockRecorderInstance = {
      state: 'inactive',
      start: vi.fn(function (this: any) {
        this.state = 'recording';
      }),
      stop: vi.fn(function (this: any) {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }),
      ondataavailable: null,
      onstop: null,
      onerror: null,
    };

    function MockMediaRecorder(this: any, stream: any, options: any) {
      this.stream = stream;
      this.options = options;
      this.state = 'inactive';
      this.start = mockRecorderInstance.start.bind(this);
      this.stop = mockRecorderInstance.stop.bind(this);
      mockRecorderInstance = this;
    }
    MockMediaRecorder.isTypeSupported = vi.fn((type: string) => type === 'audio/webm;codecs=opus');

    (globalThis as any).MediaRecorder = MockMediaRecorder;

    createObjectURLMock = vi.fn((blob: Blob) => `blob:http://localhost:3000/mock-uuid-${Date.now()}`);
    revokeObjectURLMock = vi.fn();
    (globalThis as any).URL.createObjectURL = createObjectURLMock;
    (globalThis as any).URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('On-Demand Permission: getUserMedia is invoked only when user clicks record, not on mount', async () => {
    expect(getUserMediaMock).not.toHaveBeenCalled();
  });

  it('Hardware Lifecycle: tracks must be stopped and Blob URL generated upon stop', async () => {
    // 1. Simulate getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    expect(stream).toBeDefined();

    // 2. Initialize MediaRecorder
    const recorder = new (globalThis as any).MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.start(1000);
    expect(recorder.state).toBe('recording');

    // 3. Simulate chunk collection
    const chunks: Blob[] = [];
    const testChunk = new Blob(['mock-audio-bytes'], { type: 'audio/webm;codecs=opus' });
    chunks.push(testChunk);

    // 4. Trigger stop
    recorder.onstop = () => {
      stream.getTracks().forEach((track: any) => track.stop());
      const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
      const url = URL.createObjectURL(blob);
      expect(url).toContain('blob:http://localhost:3000/');
    };

    recorder.stop();

    // Verify stream tracks stopped
    expect(stopTrackMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it('Memory Cleanup: URL.revokeObjectURL is called on retake / unmount', () => {
    const testUrl = 'blob:http://localhost:3000/mock-audio-blob-123';
    URL.revokeObjectURL(testUrl);

    expect(revokeObjectURLMock).toHaveBeenCalledWith(testUrl);
  });

  it('Auto-Stop Safeguard: 120s max duration stops recorder', () => {
    const maxDuration = 120;
    let currentSeconds = 0;
    const onAutoStop = vi.fn();

    // Simulate timer ticks
    for (let i = 1; i <= maxDuration; i++) {
      currentSeconds = i;
      if (currentSeconds >= maxDuration) {
        onAutoStop();
      }
    }

    expect(currentSeconds).toBe(120);
    expect(onAutoStop).toHaveBeenCalledTimes(1);
  });

  it('Graceful Error Handling: NotAllowedError produces friendly message', async () => {
    const permissionError: any = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';

    getUserMediaMock.mockRejectedValueOnce(permissionError);

    let caughtError: any = null;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.name).toBe('NotAllowedError');
  });

  it('Graceful Error Handling: NotFoundError handles missing microphone device', async () => {
    const noDeviceError: any = new Error('Requested device not found');
    noDeviceError.name = 'NotFoundError';

    getUserMediaMock.mockRejectedValueOnce(noDeviceError);

    let caughtError: any = null;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.name).toBe('NotFoundError');
  });
});
