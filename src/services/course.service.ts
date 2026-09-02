import { db } from '@/lib/db';
import { EnrollmentService } from './enrollment.service';

export class CourseService {
  static async getAllCourses() {
    const courses = await db.course.findMany({
      where: { isPublished: true },
      orderBy: { orderIndex: 'asc' },
      include: {
        modules: {
          include: {
            lessons: {
              select: { id: true },
            },
          },
        },
      },
    });

    return courses.map((course) => {
      const totalModules = course.modules.length;
      const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail_url: course.thumbnailUrl,
        level: course.level,
        order_index: course.orderIndex,
        total_modules: totalModules,
        total_lessons: totalLessons,
      };
    });
  }

  static async getCourseBySlug(slug: string, userId?: string) {
    const course = await db.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                quiz: {
                  select: { id: true, title: true, passingScore: true },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      const error: any = new Error('Kursus tidak ditemukan.');
      error.code = 'COURSE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    let progressMap = new Map<string, { isCompleted: boolean; videoCompleted: boolean }>();
    let quizBestScoresMap = new Map<string, number | null>();

    if (userId) {
      const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const allQuizIds = course.modules.flatMap((m) => m.lessons.map((l) => l.quiz?.id).filter(Boolean)) as string[];

      const progressRecords = await db.lessonProgress.findMany({
        where: {
          userId,
          lessonId: { in: allLessonIds },
        },
      });

      for (const p of progressRecords) {
        progressMap.set(p.lessonId, {
          isCompleted: p.isCompleted,
          videoCompleted: p.videoCompleted,
        });
      }

      if (allQuizIds.length > 0) {
        const attempts = await db.quizAttempt.findMany({
          where: {
            userId,
            quizId: { in: allQuizIds },
          },
          select: { quizId: true, score: true },
        });

        for (const a of attempts) {
          const currentBest = quizBestScoresMap.get(a.quizId) ?? null;
          if (currentBest === null || a.score > currentBest) {
            quizBestScoresMap.set(a.quizId, a.score);
          }
        }
      }
    }

    let totalLessonsCount = 0;
    let completedLessonsCount = 0;

    const modules = course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      description: m.description,
      order_index: m.orderIndex,
      lessons: m.lessons.map((l) => {
        totalLessonsCount++;
        const prog = progressMap.get(l.id);
        const isCompleted = prog?.isCompleted ?? false;
        if (isCompleted) completedLessonsCount++;

        const bestScore = l.quiz ? (quizBestScoresMap.get(l.quiz.id) ?? null) : null;

        return {
          id: l.id,
          title: l.title,
          slug: l.slug,
          order_index: l.orderIndex,
          youtube_video_id: l.youtubeVideoId,
          is_completed: isCompleted,
          video_completed: prog?.videoCompleted ?? false,
          best_quiz_score: bestScore,
        };
      }),
    }));

    const progressPercentage =
      totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail_url: course.thumbnailUrl,
      level: course.level,
      total_modules: modules.length,
      total_lessons: totalLessonsCount,
      completed_lessons: completedLessonsCount,
      user_progress_percentage: progressPercentage,
      modules,
    };
  }

  static async getLessonBySlug(courseSlug: string, lessonSlug: string, userId: string) {
    const course = await db.course.findUnique({
      where: { slug: courseSlug },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                slug: true,
                orderIndex: true,
                moduleId: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      const error: any = new Error('Kursus tidak ditemukan.');
      error.code = 'COURSE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Find specific lesson across modules
    let targetLesson: any = null;
    let targetModule: any = null;

    for (const mod of course.modules) {
      const found = mod.lessons.find((l) => l.slug === lessonSlug);
      if (found) {
        targetLesson = found;
        targetModule = mod;
        break;
      }
    }

    if (!targetLesson) {
      const error: any = new Error('Lesson tidak ditemukan.');
      error.code = 'LESSON_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Auto-enroll user idempotently (PRD-01 / ADR-P2-01)
    await EnrollmentService.autoEnroll(userId, course.id);

    // Fetch full lesson details
    const fullLesson = await db.lesson.findUnique({
      where: { id: targetLesson.id },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            passingScore: true,
          },
        },
      },
    });

    // Fetch user progress for this lesson
    const progress = await db.lessonProgress.findUnique({
      where: {
        uq_user_lesson_progress: {
          userId,
          lessonId: targetLesson.id,
        },
      },
    });

    // Fetch best quiz score if quiz exists
    let bestQuizScore: number | null = null;
    let totalAttempts = 0;
    if (fullLesson?.quiz) {
      const attempts = await db.quizAttempt.findMany({
        where: {
          userId,
          quizId: fullLesson.quiz.id,
        },
        select: { score: true },
      });
      totalAttempts = attempts.length;
      if (totalAttempts > 0) {
        bestQuizScore = Math.max(...attempts.map((a) => a.score));
      }
    }

    return {
      id: fullLesson!.id,
      title: fullLesson!.title,
      slug: fullLesson!.slug,
      youtube_video_id: fullLesson!.youtubeVideoId,
      summary_content: fullLesson!.summaryContent,
      speaking_prompt: fullLesson!.speakingPrompt,
      order_index: fullLesson!.orderIndex,
      module_id: targetModule.id,
      module_title: targetModule.title,
      module_slug: targetModule.slug,
      course_id: course.id,
      course_title: course.title,
      course_slug: course.slug,
      quiz: fullLesson!.quiz
        ? {
            id: fullLesson!.quiz.id,
            title: fullLesson!.quiz.title,
            passing_score: fullLesson!.quiz.passingScore,
          }
        : null,
      user_progress: {
        video_completed: progress?.videoCompleted ?? false,
        is_completed: progress?.isCompleted ?? false,
        best_quiz_score: bestQuizScore,
        total_quiz_attempts: totalAttempts,
      },
      syllabus: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        slug: m.slug,
        order_index: m.orderIndex,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          order_index: l.orderIndex,
          is_current: l.id === fullLesson!.id,
        })),
      })),
    };
  }
}
