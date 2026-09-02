import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { CourseService } from '@/services/course.service';
import { EnrollmentService } from '@/services/enrollment.service';

describe('Course & Enrollment Services (Unit Tests)', () => {
  let sampleUserId: string;

  beforeAll(async () => {
    // Create temporary test user
    const testUser = await db.user.upsert({
      where: { email: 'unit.test.student@example.com' },
      update: {},
      create: {
        email: 'unit.test.student@example.com',
        passwordHash: '$2a$12$eXampleHashedPasswordForTestOnly12345678901234567890',
        fullName: 'Unit Test Student',
        role: 'student',
      },
    });
    sampleUserId = testUser.id;
  });

  it('CourseService.getAllCourses should return list of published courses', async () => {
    const courses = await CourseService.getAllCourses();
    expect(Array.isArray(courses)).toBe(true);
    expect(courses.length).toBeGreaterThan(0);

    const firstCourse = courses[0];
    expect(firstCourse).toHaveProperty('id');
    expect(firstCourse).toHaveProperty('title');
    expect(firstCourse).toHaveProperty('slug');
    expect(firstCourse).toHaveProperty('total_modules');
    expect(firstCourse).toHaveProperty('total_lessons');
    expect(firstCourse.total_modules).toBeGreaterThan(0);
    expect(firstCourse.total_lessons).toBeGreaterThan(0);
  });

  it('CourseService.getCourseBySlug should return full syllabus hierarchy', async () => {
    const course = await CourseService.getCourseBySlug(
      'english-for-confident-speaking',
      sampleUserId
    );

    expect(course).not.toBeNull();
    expect(course.slug).toBe('english-for-confident-speaking');
    expect(course.modules.length).toBe(2);
    expect(course.total_lessons).toBe(4);
    expect(course.user_progress_percentage).toBe(0);

    // Verify first module lessons
    const firstModule = course.modules[0];
    expect(firstModule.lessons.length).toBe(2);
    expect(firstModule.lessons[0].slug).toBe('mindset-fluency-over-perfection');
  });

  it('CourseService.getCourseBySlug should throw 404 for invalid slug', async () => {
    await expect(
      CourseService.getCourseBySlug('non-existent-course-slug')
    ).rejects.toThrowError(/Kursus tidak ditemukan/);
  });

  it('EnrollmentService.autoEnroll should be idempotent and not create duplicate entries', async () => {
    const course = await db.course.findFirst({
      where: { slug: 'english-for-confident-speaking' },
    });

    // First enrollment
    const enrollment1 = await EnrollmentService.autoEnroll(sampleUserId, course!.id);
    expect(enrollment1).toBeDefined();
    expect(enrollment1.userId).toBe(sampleUserId);
    expect(enrollment1.courseId).toBe(course!.id);

    // Second enrollment (idempotency check)
    const enrollment2 = await EnrollmentService.autoEnroll(sampleUserId, course!.id);
    expect(enrollment2.id).toBe(enrollment1.id);

    // Verify exactly 1 record exists
    const totalCount = await db.enrollment.count({
      where: {
        userId: sampleUserId,
        courseId: course!.id,
      },
    });
    expect(totalCount).toBe(1);
  });

  it('CourseService.getLessonBySlug should support Free Navigation and auto-enrollment', async () => {
    // Open Lesson 4 directly (jumping ahead)
    const lessonData = await CourseService.getLessonBySlug(
      'english-for-confident-speaking',
      'mengekspresikan-opini',
      sampleUserId
    );

    expect(lessonData).toBeDefined();
    expect(lessonData.slug).toBe('mengekspresikan-opini');
    expect(lessonData.title).toBe('Lesson 4: Mengekspresikan Opini & Rasa Setuju');
    expect(lessonData.youtube_video_id).toBe('kJQP7kiw5Fk');
    expect(lessonData.speaking_prompt).toBeDefined();
    expect(lessonData.syllabus.length).toBe(2);

    // Check that user is auto-enrolled
    const enrollment = await EnrollmentService.getUserEnrollment(
      sampleUserId,
      lessonData.course_id
    );
    expect(enrollment).not.toBeNull();
  });
});
