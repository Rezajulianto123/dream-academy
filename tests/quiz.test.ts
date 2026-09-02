import { describe, it, expect } from 'vitest';

describe('Phase 5 — Checkpoint Quiz Unit Tests', () => {
  describe('Deterministic Scoring & Percentage Formula', () => {
    function calculateScore(correctCount: number, totalQuestions: number): number {
      if (totalQuestions <= 0) return 0;
      return Math.round((correctCount / totalQuestions) * 100);
    }

    function isPassed(score: number, passingScore: number = 70): boolean {
      return score >= passingScore;
    }

    it('should accurately calculate scores for 3-question quizzes', () => {
      expect(calculateScore(0, 3)).toBe(0);
      expect(calculateScore(1, 3)).toBe(33);
      expect(calculateScore(2, 3)).toBe(67);
      expect(calculateScore(3, 3)).toBe(100);

      expect(isPassed(calculateScore(2, 3))).toBe(false); // 67% fails threshold 70%
      expect(isPassed(calculateScore(3, 3))).toBe(true);  // 100% passes threshold 70%
    });

    it('should accurately calculate scores for 4-question quizzes', () => {
      expect(calculateScore(0, 4)).toBe(0);
      expect(calculateScore(1, 4)).toBe(25);
      expect(calculateScore(2, 4)).toBe(50);
      expect(calculateScore(3, 4)).toBe(75);
      expect(calculateScore(4, 4)).toBe(100);

      expect(isPassed(calculateScore(2, 4))).toBe(false); // 50% fails
      expect(isPassed(calculateScore(3, 4))).toBe(true);  // 75% passes
      expect(isPassed(calculateScore(4, 4))).toBe(true);  // 100% passes
    });

    it('should accurately calculate scores for 5-question quizzes', () => {
      expect(calculateScore(0, 5)).toBe(0);
      expect(calculateScore(1, 5)).toBe(20);
      expect(calculateScore(2, 5)).toBe(40);
      expect(calculateScore(3, 5)).toBe(60);
      expect(calculateScore(4, 5)).toBe(80);
      expect(calculateScore(5, 5)).toBe(100);

      expect(isPassed(calculateScore(3, 5))).toBe(false); // 60% fails
      expect(isPassed(calculateScore(4, 5))).toBe(true);  // 80% passes
      expect(isPassed(calculateScore(5, 5))).toBe(true);  // 100% passes
    });
  });

  describe('Monotonic Best Score Calculation', () => {
    it('should calculate the maximum score across all attempts', () => {
      const attempts = [{ score: 60 }, { score: 80 }, { score: 70 }];
      const bestScore = Math.max(...attempts.map((a) => a.score));
      expect(bestScore).toBe(80);
    });

    it('should never decrease best score after a lower-score retake', () => {
      let attempts = [{ score: 80 }];
      let bestScore = Math.max(...attempts.map((a) => a.score));
      expect(bestScore).toBe(80);

      // Student retakes and gets 50
      attempts.push({ score: 50 });
      bestScore = Math.max(...attempts.map((a) => a.score));
      expect(bestScore).toBe(80);
    });
  });

  describe('Dual-Trigger Lesson Completion Logic (PRD-02 / FR-06)', () => {
    function evaluateLessonCompletion(
      videoCompleted: boolean,
      bestScore: number | null,
      alreadyCompleted: boolean = false,
      passingScore: number = 70
    ): boolean {
      if (alreadyCompleted) return true;
      const hasPassedQuiz = bestScore !== null && bestScore >= passingScore;
      return videoCompleted && hasPassedQuiz;
    }

    it('should not complete lesson if video is completed but quiz failed (< 70)', () => {
      expect(evaluateLessonCompletion(true, 67)).toBe(false);
    });

    it('should not complete lesson if quiz passed (>= 70) but video is not completed', () => {
      expect(evaluateLessonCompletion(false, 80)).toBe(false);
    });

    it('should complete lesson when both video is completed and quiz passed', () => {
      expect(evaluateLessonCompletion(true, 80)).toBe(true);
    });

    it('should maintain completed state permanently even if subsequent retake score is low', () => {
      expect(evaluateLessonCompletion(true, 50, true)).toBe(true);
      expect(evaluateLessonCompletion(false, 0, true)).toBe(true);
    });
  });
});
