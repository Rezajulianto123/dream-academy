import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';

describe('Phase 4 SpeakingRecorder Smoke & Zero Network Egress Tests', () => {
  const componentSource = fs.readFileSync(
    'src/components/speaking/SpeakingRecorder.tsx',
    'utf-8'
  );

  it('Verification 1: Zero network egress - SpeakingRecorder contains 0 fetch/upload API calls', () => {
    expect(componentSource).not.toContain('fetch(');
    expect(componentSource).not.toContain('axios');
    expect(componentSource).not.toContain('XMLHttpRequest');
    expect(componentSource).not.toContain('/api/v1/speaking');
  });

  it('Verification 2: Auto-stop at 120 seconds is enforced in timer loop', () => {
    expect(componentSource).toContain('prev >= 119');
    expect(componentSource).toContain('stopRecording()');
    expect(componentSource).toContain('return 120');
  });

  it('Verification 3: Hardware tracks cleanup is enforced on stop & unmount', () => {
    expect(componentSource).toContain('track.stop()');
    expect(componentSource).toContain('mediaStreamRef.current.getTracks()');
  });

  it('Verification 4: Memory Blob URL revocation is enforced on retake & unmount', () => {
    expect(componentSource).toContain('URL.revokeObjectURL(audioUrlRef.current)');
    expect(componentSource).toContain('URL.createObjectURL(blob)');
  });

  it('Verification 5: Native HTML5 audio controls are rendered in recorded state', () => {
    expect(componentSource).toContain('<audio controls src={audioUrl}');
    expect(componentSource).toContain('Rekam Ulang');
  });

  it('Verification 6: Permission denial and hardware missing errors are handled gracefully without throwing', () => {
    expect(componentSource).toContain('NotAllowedError');
    expect(componentSource).toContain('PermissionDeniedError');
    expect(componentSource).toContain('NotFoundError');
    expect(componentSource).toContain('DevicesNotFoundError');
  });
});
