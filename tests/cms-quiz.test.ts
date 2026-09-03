import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import {
  GET as getAdminLessonQuiz,
  POST as createAdminLessonQuiz,
} from '@/app/api/v1/admin/lessons/[id]/quiz/route';
import {
  GET as getAdminQuizDetail,
  PUT as updateAdminQuiz,
  DELETE as deleteAdminQuiz,
} from '@/app/api/v1/admin/quizzes/[id]/route';
import {
  POST as createAdminQuestion,
} from '@/app/api/v1/admin/quizzes/[id]/questions/route';
import { PUT as reorderAdminQuestions } from '@/app/api/v1/admin/quizzes/[id]/questions/reorder/route';
import {
  GET as getAdminQuestionDetail,
  PUT as updateAdminQuestion,
  DELETE as deleteAdminQuestion,
} from '@/app/api/v1/admin/questions/[id]/route';
import {
  POST as createAdminOption,
} from '@/app/api/v1/admin/questions/[id]/options/route';
import {
  PUT as updateAdminOption,
  DELETE as deleteAdminOption,
} from '@/app/api/v1/admin/options/[id]/route';
import { QuizService } from '@/services/quiz.service';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

describe('BUILD-06.5 CMS Quiz Builder Foundation Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let studentUserId: string;

  let testCourseId: string;
  let testModuleId: string;
  let testLessonId: string;

  let testQuizId: string;
  let testQuestionId: string;
  let testOptionId: string;

  beforeAll(async () => {
    // 1. Clean up test records
    await db.course.deleteMany({
      where: {
        slug: 'quiz-builder-test-course',
      },
    });

    // 2. Setup Student
    const studentUser = await db.user.upsert({
      where: { email: 'quiz_builder_student@test.com' },
      update: { role: 'student' },
      create: {
        email: 'quiz_builder_student@test.com',
        passwordHash: await bcrypt.hash('StudentSecret123!', 10),
        fullName: 'Quiz Builder Student',
        role: 'student',
      },
    });
    studentUserId = studentUser.id;
    studentToken = signToken({
      userId: studentUser.id,
      email: studentUser.email,
      role: 'student',
    });

    // 3. Setup Admin
    const adminUser = await db.user.upsert({
      where: { email: 'quiz_builder_admin@test.com' },
      update: { role: 'admin' },
      create: {
        email: 'quiz_builder_admin@test.com',
        passwordHash: await bcrypt.hash('AdminSecret123!', 10),
        fullName: 'Quiz Builder Admin',
        role: 'admin',
      },
    });
    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    });

    // 4. Create Base Hierarchy
    const course = await db.course.create({
      data: {
        title: 'Quiz Builder Test Course',
        slug: 'quiz-builder-test-course',
        isPublished: true,
      },
    });
    testCourseId = course.id;

    const module = await db.module.create({
      data: {
        courseId: testCourseId,
        title: 'Modul Kuis',
        slug: 'modul-kuis',
        isPublished: true,
      },
    });
    testModuleId = module.id;

    const lesson = await db.lesson.create({
      data: {
        moduleId: testModuleId,
        title: 'Pelajaran Kuis',
        slug: 'pelajaran-kuis',
        youtubeVideoId: 'dQw4w9WgXcQ',
        isPublished: true,
      },
    });
    testLessonId = lesson.id;
  });

  afterAll(async () => {
    await db.course.deleteMany({
      where: {
        slug: 'quiz-builder-test-course',
      },
    });
  });

  describe('1. Admin Quiz Authorization Guards', () => {
    it('should reject unauthenticated quiz requests with HTTP 401', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/lessons/${testLessonId}/quiz`);
      const res = await getAdminLessonQuiz(req, { params: { id: testLessonId } });
      expect(res.status).toBe(401);
    });

    it('should reject student quiz requests with HTTP 403 Forbidden', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/lessons/${testLessonId}/quiz`, {
        headers: { authorization: `Bearer ${studentToken}` },
      });
      const res = await getAdminLessonQuiz(req, { params: { id: testLessonId } });
      expect(res.status).toBe(403);
    });

    it('should return null data for lesson without quiz for admin', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/lessons/${testLessonId}/quiz`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const res = await getAdminLessonQuiz(req, { params: { id: testLessonId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeNull();
    });
  });

  describe('2. Quiz Management (CRUD)', () => {
    it('should create a new Quiz under lesson via POST', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/lessons/${testLessonId}/quiz`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Kuis Checkpoint Test',
          passingScore: 80,
        }),
      });

      const res = await createAdminLessonQuiz(req, { params: { id: testLessonId } });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Kuis Checkpoint Test');
      expect(json.data.passingScore).toBe(80);

      testQuizId = json.data.id;
    });

    it('should reject creating duplicate quiz for same lesson with HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/lessons/${testLessonId}/quiz`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Kuis Duplikat',
        }),
      });

      const res = await createAdminLessonQuiz(req, { params: { id: testLessonId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Pelajaran ini sudah memiliki kuis');
    });

    it('should update Quiz title & passingScore via PUT', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${testQuizId}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Kuis Checkpoint Updated',
          passingScore: 75,
        }),
      });

      const res = await updateAdminQuiz(req, { params: { id: testQuizId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Kuis Checkpoint Updated');
      expect(json.data.passingScore).toBe(75);
    });
  });

  describe('3. Question & Option Management', () => {
    it('should reject question creation if not exactly 1 correct answer', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${testQuizId}/questions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          questionText: 'Apa ibukota Indonesia?',
          options: [
            { optionText: 'Jakarta', isCorrect: true },
            { optionText: 'Nusantara', isCorrect: true }, // 2 correct!
          ],
        }),
      });

      const res = await createAdminQuestion(req, { params: { id: testQuizId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('persis 1 jawaban yang benar');
    });

    it('should create Question with Options via POST', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${testQuizId}/questions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          questionText: 'Manakah tata bahasa yang benar?',
          explanation: 'I am a student adalah tata bahasa yang benar.',
          options: [
            { optionText: 'I am a student', isCorrect: true },
            { optionText: 'I is a student', isCorrect: false },
            { optionText: 'I are a student', isCorrect: false },
          ],
        }),
      });

      const res = await createAdminQuestion(req, { params: { id: testQuizId } });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.questionText).toBe('Manakah tata bahasa yang benar?');
      expect(json.data.options.length).toBe(3);

      testQuestionId = json.data.id;
      testOptionId = json.data.options[0].id;
    });

    it('should add a new Option to Question via POST', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/questions/${testQuestionId}/options`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          optionText: 'I be a student',
          isCorrect: false,
        }),
      });

      const res = await createAdminOption(req, { params: { id: testQuestionId } });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.optionText).toBe('I be a student');
    });

    it('should update Option via PUT', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/options/${testOptionId}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          optionText: 'I am a student (Correct)',
        }),
      });

      const res = await updateAdminOption(req, { params: { id: testOptionId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.optionText).toBe('I am a student (Correct)');
    });

    it('should reorder Questions via PUT', async () => {
      // Create Question 2
      const q2 = await db.quizQuestion.create({
        data: {
          quizId: testQuizId,
          questionText: 'Soal 2',
          orderIndex: 1,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${testQuizId}/questions/reorder`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          questionIds: [q2.id, testQuestionId],
        }),
      });

      const res = await reorderAdminQuestions(req, { params: { id: testQuizId } });
      expect(res.status).toBe(200);

      const updatedQ2 = await db.quizQuestion.findUnique({ where: { id: q2.id } });
      expect(updatedQ2?.orderIndex).toBe(0);

      // Clean up q2
      await db.quizQuestion.delete({ where: { id: q2.id } });
    });
  });

  describe('4. Dependency Protection (HTTP 400 Rules on Attempts)', () => {
    it('should reject Quiz DELETE with HTTP 400 if student attempts exist', async () => {
      // 1. Create student attempt for testQuizId
      await db.quizAttempt.create({
        data: {
          userId: studentUserId,
          quizId: testQuizId,
          score: 100,
          isPassed: true,
        },
      });

      // 2. Attempt DELETE Quiz
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${testQuizId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteAdminQuiz(req, { params: { id: testQuizId } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Tidak dapat menghapus kuis yang sudah memiliki riwayat pengerjaan siswa');

      // 3. Attempt DELETE Question
      const qReq = new NextRequest(`http://localhost:3000/api/v1/admin/questions/${testQuestionId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const qRes = await deleteAdminQuestion(qReq, { params: { id: testQuestionId } });
      expect(qRes.status).toBe(400);

      // 4. Attempt DELETE Option
      const oReq = new NextRequest(`http://localhost:3000/api/v1/admin/options/${testOptionId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const oRes = await deleteAdminOption(oReq, { params: { id: testOptionId } });
      expect(oRes.status).toBe(400);

      // Clean up attempt
      await db.quizAttempt.deleteMany({ where: { quizId: testQuizId } });
    });

    it('should allow Quiz DELETE when 0 student attempts exist', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/admin/quizzes/${testQuizId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteAdminQuiz(req, { params: { id: testQuizId } });
      expect(res.status).toBe(200);

      const checkQuiz = await db.quiz.findUnique({ where: { id: testQuizId } });
      expect(checkQuiz).toBeNull();
    });
  });

  describe('5. Student Quiz Engine Integration & Regression', () => {
    it('should allow student to fetch quiz via QuizService with updated metadata', async () => {
      // Re-create quiz for regression check
      const q = await db.quiz.create({
        data: {
          lessonId: testLessonId,
          title: 'Regression Quiz',
          passingScore: 70,
          questions: {
            create: [
              {
                questionText: 'What is 1 + 1?',
                options: {
                  create: [
                    { optionText: '2', isCorrect: true, orderIndex: 0 },
                    { optionText: '3', isCorrect: false, orderIndex: 1 },
                  ],
                },
              },
            ],
          },
        },
      });

      const studentQuizData = await QuizService.getQuizByLessonSlug('quiz-builder-test-course', 'pelajaran-kuis', studentUserId);
      expect(studentQuizData.title).toBe('Regression Quiz');
      expect(studentQuizData.questions.length).toBe(1);
      // Anti-cheat verification: option should NOT reveal isCorrect to student!
      expect(studentQuizData.questions[0].options[0]).not.toHaveProperty('isCorrect');

      // Clean up
      await db.quiz.delete({ where: { id: q.id } });
    });
  });
});
