-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'student',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 2. COURSES TABLE
CREATE TABLE "courses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "description" TEXT,
    "thumbnail_url" VARCHAR(500),
    "level" VARCHAR(50) NOT NULL DEFAULT 'beginner',
    "is_published" BOOLEAN NOT NULL DEFAULT TRUE,
    "order_index" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 3. MODULES TABLE
CREATE TABLE "modules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order_index" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "uq_module_course_slug" UNIQUE ("course_id", "slug")
);

-- 4. LESSONS TABLE
CREATE TABLE "lessons" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "youtube_video_id" VARCHAR(50) NOT NULL,
    "summary_content" TEXT,
    "speaking_prompt" TEXT,
    "order_index" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "uq_lesson_module_slug" UNIQUE ("module_id", "slug")
);

-- 5. ENROLLMENTS TABLE
CREATE TABLE "enrollments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "course_id" UUID NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "last_accessed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT "uq_user_course_enrollment" UNIQUE ("user_id", "course_id")
);

-- 6. LESSON_PROGRESS TABLE
CREATE TABLE "lesson_progress" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "lesson_id" UUID NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
    "video_completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "video_completed_at" TIMESTAMPTZ(6),
    "is_completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "uq_user_lesson_progress" UNIQUE ("user_id", "lesson_id")
);

-- 7. QUIZZES TABLE
CREATE TABLE "quizzes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL UNIQUE REFERENCES "lessons"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "passing_score" INT NOT NULL DEFAULT 70,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 8. QUIZ_QUESTIONS TABLE
CREATE TABLE "quiz_questions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL REFERENCES "quizzes"("id") ON DELETE CASCADE,
    "question_text" TEXT NOT NULL,
    "explanation" TEXT,
    "order_index" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 9. QUIZ_OPTIONS TABLE
CREATE TABLE "quiz_options" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL REFERENCES "quiz_questions"("id") ON DELETE CASCADE,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT FALSE,
    "order_index" INT NOT NULL DEFAULT 0
);

-- 10. QUIZ_ATTEMPTS TABLE
CREATE TABLE "quiz_attempts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "quiz_id" UUID NOT NULL REFERENCES "quizzes"("id") ON DELETE CASCADE,
    "score" INT NOT NULL CHECK ("score" >= 0 AND "score" <= 100),
    "is_passed" BOOLEAN NOT NULL DEFAULT FALSE,
    "answers_payload" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX "idx_modules_course_id" ON "modules"("course_id");
CREATE INDEX "idx_lessons_module_id" ON "lessons"("module_id");
CREATE INDEX "idx_quiz_questions_quiz_id" ON "quiz_questions"("quiz_id");
CREATE INDEX "idx_quiz_options_question_id" ON "quiz_options"("question_id");
CREATE INDEX "idx_enrollments_user" ON "enrollments"("user_id", "is_active");
CREATE INDEX "idx_lesson_progress_user_lesson" ON "lesson_progress"("user_id", "lesson_id");
CREATE INDEX "idx_quiz_attempts_user_quiz" ON "quiz_attempts"("user_id", "quiz_id", "score" DESC);
CREATE INDEX "idx_quiz_attempts_user_submitted" ON "quiz_attempts"("user_id", "submitted_at" DESC);
