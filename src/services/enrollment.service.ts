import { db } from '@/lib/db';

export class EnrollmentService {
  static async autoEnroll(userId: string, courseId: string) {
    const enrollment = await db.enrollment.upsert({
      where: {
        uq_user_course_enrollment: {
          userId,
          courseId,
        },
      },
      update: {
        lastAccessedAt: new Date(),
        isActive: true,
      },
      create: {
        userId,
        courseId,
        isActive: true,
      },
    });

    return enrollment;
  }

  static async getUserEnrollment(userId: string, courseId: string) {
    return db.enrollment.findUnique({
      where: {
        uq_user_course_enrollment: {
          userId,
          courseId,
        },
      },
    });
  }
}
