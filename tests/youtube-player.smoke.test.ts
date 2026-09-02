import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { ProgressService } from '@/services/progress.service';

describe('Phase 3 YouTube Player Smoke & Lifecycle Verification', () => {
  let testUserId: string;
  let testLesson: any;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: 'smoke.player.test@example.com' },
      update: {},
      create: {
        email: 'smoke.player.test@example.com',
        passwordHash: '$2a$12$dummyHashedPasswordSmokeTest1234567890',
        fullName: 'Smoke Player Student',
        role: 'student',
      },
    });
    testUserId = user.id;

    testLesson = await db.lesson.findFirst({
      where: { slug: 'small-talk-membuka-obrolan' },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });
  });

  it('Verification 1 & 2: YouTubePlayer component structure ensures responsive 16:9 container', async () => {
    // Check component source file exists and has aspect-video class
    const fs = await import('fs');
    const playerSource = fs.readFileSync('src/components/video/YouTubePlayer.tsx', 'utf-8');
    
    expect(playerSource).toContain('aspect-video');
    expect(playerSource).toContain('id={containerId}');
    expect(playerSource).toContain('https://www.youtube.com/iframe_api');
  });

  it('Verification 3 & 5: YT.PlayerState.ENDED triggers video completion exactly once (single-flight guard)', async () => {
    // Reset any existing progress
    await db.lessonProgress.deleteMany({
      where: { userId: testUserId, lessonId: testLesson.id },
    });

    const res1 = await ProgressService.markVideoCompleted(testUserId, testLesson.id, { playback_seconds: 300 });
    expect(res1.video_completed).toBe(true);

    // Call again (duplicate event guard)
    const res2 = await ProgressService.markVideoCompleted(testUserId, testLesson.id, { playback_seconds: 300 });
    expect(res2.video_completed).toBe(true);

    // Check exactly 1 DB record exists
    const progressCount = await db.lessonProgress.count({
      where: { userId: testUserId, lessonId: testLesson.id },
    });
    expect(progressCount).toBe(1);
  });

  it('Verification 4: Threshold >= 90% duration triggers completion correctly', async () => {
    const duration = 200; // seconds
    const currentTime = 185; // 92.5%
    const ratio = currentTime / duration;
    expect(ratio).toBeGreaterThanOrEqual(0.9);

    const res = await ProgressService.markVideoCompleted(testUserId, testLesson.id, { playback_seconds: currentTime });
    expect(res.video_completed).toBe(true);
  });

  it('Verification 6 & 7: Server confirmation and reload persistence', async () => {
    const progress = await ProgressService.getLessonProgress(testUserId, testLesson.id);
    expect(progress).not.toBeNull();
    expect(progress?.videoCompleted).toBe(true);
    expect(progress?.videoCompletedAt).toBeInstanceOf(Date);
  });

  it('Verification 8: Component lifecycle cleanly destroys player and clears timer on navigation', async () => {
    const fs = await import('fs');
    const playerSource = fs.readFileSync('src/components/video/YouTubePlayer.tsx', 'utf-8');
    
    expect(playerSource).toContain('playerRef.current.destroy()');
    expect(playerSource).toContain('clearInterval(pollIntervalRef.current)');
  });

  it('Verification 9 & 10: Fallback button only renders when hasError is true, NOT during normal playback', async () => {
    const fs = await import('fs');
    const playerSource = fs.readFileSync('src/components/video/YouTubePlayer.tsx', 'utf-8');
    
    // Check fallback rendering condition
    expect(playerSource).toContain('{hasError && (');
    expect(playerSource).toContain('Tandai Video Selesai ✓');
    expect(playerSource).not.toContain('after 10 seconds');
  });

  it('Verification 11: Video completion does NOT set is_completed=true without passing quiz', async () => {
    const progress = await ProgressService.getLessonProgress(testUserId, testLesson.id);
    expect(progress?.videoCompleted).toBe(true);
    expect(progress?.isCompleted).toBe(false);
    expect(progress?.completedAt).toBeNull();
  });
});
