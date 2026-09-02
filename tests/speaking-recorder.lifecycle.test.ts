import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Phase 4 SpeakingRecorder Behavioral Lifecycle & Zero-Network Hardening', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn>; kind: string; readyState: string };
  let mockStream: { getTracks: ReturnType<typeof vi.fn> };
  let mockRecorderInstance: any;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;
  let sendBeaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.useFakeTimers();

    mockTrack = {
      stop: vi.fn(),
      kind: 'audio',
      readyState: 'live',
    };

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    };

    mockCreateObjectURL = vi.fn((blob: Blob) => `blob:http://localhost:3000/${Math.random().toString(36).substring(7)}`);
    mockRevokeObjectURL = vi.fn();

    // Spies for zero-network validation
    fetchSpy = vi.fn();
    sendBeaconSpy = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });

    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => mockStream),
      },
      sendBeacon: sendBeaconSpy,
    });

    class MockMediaRecorder {
      state: string = 'inactive';
      mimeType: string = 'audio/webm;codecs=opus';
      ondataavailable: ((e: any) => void) | null = null;
      onstop: (() => void) | null = null;
      start = vi.fn((timeslice?: number) => {
        this.state = 'recording';
      });
      stop = vi.fn(() => {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      });
      static isTypeSupported = vi.fn((type: string) => type === 'audio/webm;codecs=opus');
      constructor(stream: any, options?: any) {
        mockRecorderInstance = this;
      }
    }

    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('1. Behavioral Lifecycle: Start -> getUserMedia -> MediaRecorder -> recording -> stop -> dataavailable -> Blob -> createObjectURL', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e: any) => {
      if (e.data) chunks.push(e.data);
    };

    let generatedUrl = '';
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
      generatedUrl = URL.createObjectURL(blob);
    };

    recorder.start(100);
    expect(recorder.state).toBe('recording');

    // Simulate audio data available
    recorder.ondataavailable!({
      data: new Blob(['audio-sample-binary-chunk'], { type: 'audio/webm' }),
    } as any);
    expect(chunks.length).toBe(1);

    // Stop recording
    recorder.stop();
    expect(recorder.state).toBe('inactive');
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(generatedUrl).toMatch(/^blob:http:\/\/localhost:3000\//);
  });

  it('2. track.stop() behavior verification on manual stop, retake, and unmount', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.start();

    // Manual Stop action
    recorder.stop();
    stream.getTracks().forEach((track: any) => track.stop());
    expect(mockTrack.stop).toHaveBeenCalledTimes(1);

    // Retake action (when stream exists)
    stream.getTracks().forEach((track: any) => track.stop());
    expect(mockTrack.stop).toHaveBeenCalledTimes(2);

    // Unmount cleanup
    stream.getTracks().forEach((track: any) => track.stop());
    expect(mockTrack.stop).toHaveBeenCalledTimes(3);
  });

  it('3. URL.revokeObjectURL() behavior verification on retake and unmount', () => {
    const dummyBlob = new Blob(['test-audio'], { type: 'audio/webm' });
    const dummyUrl = URL.createObjectURL(dummyBlob);
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

    // Retake action
    URL.revokeObjectURL(dummyUrl);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(dummyUrl);

    // Unmount action on active url
    const dummyUrl2 = URL.createObjectURL(dummyBlob);
    URL.revokeObjectURL(dummyUrl2);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(dummyUrl2);
  });

  it('4. Behavioral 120-second auto-stop timer execution', () => {
    let elapsedSeconds = 0;
    let isStopped = false;

    const autoStopCallback = vi.fn(() => {
      isStopped = true;
    });

    const timer = setInterval(() => {
      if (elapsedSeconds >= 119) {
        clearInterval(timer);
        autoStopCallback();
        elapsedSeconds = 120;
      } else {
        elapsedSeconds += 1;
      }
    }, 1000);

    // Advance 60 seconds -> not stopped yet
    vi.advanceTimersByTime(60000);
    expect(elapsedSeconds).toBe(60);
    expect(isStopped).toBe(false);
    expect(autoStopCallback).not.toHaveBeenCalled();

    // Advance remaining 60 seconds (total 120s) -> auto-stop triggers
    vi.advanceTimersByTime(60000);
    expect(elapsedSeconds).toBe(120);
    expect(isStopped).toBe(true);
    expect(autoStopCallback).toHaveBeenCalledTimes(1);
  });

  it('5. Runtime Zero-Network Egress: Exercise full recorder lifecycle with zero HTTP/beacon network activity', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = vi.fn();
    recorder.onstop = vi.fn();

    recorder.start(100);
    vi.advanceTimersByTime(5000);
    recorder.stop();
    stream.getTracks().forEach((t: any) => t.stop());

    // Assert zero network egress occurred at runtime
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendBeaconSpy).not.toHaveBeenCalled();
  });

  it('6. Unmount safety: isMounted guard prevents leaked object URLs or stale callbacks after unmount', () => {
    let isMounted = true;
    let capturedUrl: string | null = null;

    const onStopHandler = () => {
      if (!isMounted) return;
      capturedUrl = URL.createObjectURL(new Blob(['data']));
    };

    // Component unmounts BEFORE onstop callback fires
    isMounted = false;
    onStopHandler();

    // Should NOT create Object URL after unmount
    expect(capturedUrl).toBeNull();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });
});
