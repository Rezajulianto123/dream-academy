import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { CourseService } from '@/services/course.service';

describe('Phase 4 Speaking Practice Smoke & Zero-Egress Security Tests', () => {
  let sampleUserId: string;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: 'speaking.smoke.test@example.com' },
      update: {},
      create: {
        email: 'speaking.smoke.test@example.com',
        passwordHash: '$2a$12$dummyPasswordForSpeakingTest1234567890',
        fullName: 'Speaking Practice Student',
        role: 'student',
      },
    });
    sampleUserId = user.id;
  });

  it('Verification 1: SpeakingPracticeSection component exists with proper Client Component directive', () => {
    const componentPath = path.resolve('src/components/speaking/SpeakingPracticeSection.tsx');
    expect(fs.existsSync(componentPath)).toBe(true);

    const content = fs.readFileSync(componentPath, 'utf-8');
    expect(content).toContain("'use client'");
    expect(content).toContain('useAudioRecorder');
    expect(content).toContain('SpeakingPracticeSection');
  });

  it('Verification 2: useAudioRecorder hook exists and enforces 120s limit & MIME priorities', () => {
    const hookPath = path.resolve('src/hooks/useAudioRecorder.ts');
    expect(fs.existsSync(hookPath)).toBe(true);

    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('maxDurationSeconds = 120');
    expect(content).toContain('MIME_TYPE_PRIORITIES');
    expect(content).toContain('audio/webm;codecs=opus');
    expect(content).toContain('audio/mp4');
    expect(content).toContain('releaseMediaStream');
    expect(content).toContain('revokeCurrentAudioUrl');
  });

  it('Verification 3: Zero-Storage & Zero Network Egress Security Audit', () => {
    const hookContent = fs.readFileSync('src/hooks/useAudioRecorder.ts', 'utf-8');
    const componentContent = fs.readFileSync('src/components/speaking/SpeakingPracticeSection.tsx', 'utf-8');

    // 1. Ensure no HTTP fetch / upload calls in audio hook & component
    expect(hookContent).not.toContain('fetch(');
    expect(hookContent).not.toContain('axios');
    expect(hookContent).not.toContain('XMLHttpRequest');
    expect(hookContent).not.toContain('sendBeacon');
    expect(hookContent).not.toContain('WebSocket');

    expect(componentContent).not.toContain('fetch(');
    expect(componentContent).not.toContain('axios');
    expect(componentContent).not.toContain('XMLHttpRequest');
    expect(componentContent).not.toContain('sendBeacon');

    // 2. Ensure zero audio upload API route exists in src/app/api
    const apiFiles = fs.readdirSync('src/app/api/v1', { recursive: true }) as string[];
    const audioApiRoutes = apiFiles.filter((file) =>
      file.toLowerCase().includes('audio') || file.toLowerCase().includes('upload') || file.toLowerCase().includes('recording')
    );
    expect(audioApiRoutes.length).toBe(0);
  });

  it('Verification 4: Database Schema Integrity (Zero DB tables/columns added for audio storage)', async () => {
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf-8');
    
    // Check that no audio_url or audio_blob columns were added to lessonProgress or any model
    expect(schemaContent).not.toContain('audio_url');
    expect(schemaContent).not.toContain('audioBlob');
    expect(schemaContent).not.toContain('audio_file');
    expect(schemaContent).not.toContain('voice_recording');
  });

  it('Verification 5: Lesson Room integration loads SpeakingPracticeSection dynamically with speaking_prompt', async () => {
    const pageContent = fs.readFileSync(
      'src/app/courses/[slug]/lessons/[lessonSlug]/page.tsx',
      'utf-8'
    );

    expect(pageContent).toContain('SpeakingPracticeSection');
    expect(pageContent).toContain('speakingPrompt={lessonData.speaking_prompt}');

    // Verify CourseService provides speaking_prompt for all lessons
    const lesson = await CourseService.getLessonBySlug(
      'english-for-confident-speaking',
      'mindset-fluency-over-perfection',
      sampleUserId
    );

    expect(lesson).toBeDefined();
    expect(lesson.speaking_prompt).toBeDefined();
    expect(typeof lesson.speaking_prompt).toBe('string');
    expect(lesson.speaking_prompt.length).toBeGreaterThan(10);
  });

  it('Verification 6: Audio playback element uses native HTML5 <audio> with controls', () => {
    const componentContent = fs.readFileSync('src/components/speaking/SpeakingPracticeSection.tsx', 'utf-8');
    
    expect(componentContent).toContain('<audio');
    expect(componentContent).toContain('controls');
    expect(componentContent).toContain('src={audioUrl}');
  });

  it('Verification 7: Non-blocking error handling banner does not impede lesson progress', () => {
    const componentContent = fs.readFileSync('src/components/speaking/SpeakingPracticeSection.tsx', 'utf-8');

    // Error banner renders friendly guidance without disabling other components
    expect(componentContent).toContain('status === \'denied\'');
    expect(componentContent).toContain('Izin Akses Mikrofon Diperlukan');
    expect(componentContent).toContain('Anda tetap dapat membaca skenario dan melanjutkan ke Checkpoint Quiz tanpa terblokir');
  });
});
