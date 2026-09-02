# API Specification & Contracts — Dream Academy

> **Version:** 1.0 (MVP RESTful Specification)  
> **Status:** APPROVED / Source of Truth for Builder & QA Agents  
> **Author:** Architect Agent / Technical Lead  
> **Base URL:** `/api/v1`  
> **Last Updated:** 2026-09-02

---

## 1. Global Conventions & Standards

- **Protocols & Format:** HTTPS, RESTful, JSON Payloads (`Content-Type: application/json`).
- **Authentication:** Bearer JWT Token via `Authorization: Bearer <TOKEN>` header ATAU HttpOnly session cookie (`auth_token`).
- **Standard Success Response Format:**
  ```json
  {
    "success": true,
    "data": {},
    "meta": {}
  }
  ```
- **Standard Error Response Format:**
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Pesan error yang mudah dipahami pengguna.",
      "details": []
    }
  }
  ```
- **Standard HTTP Status Codes:**
  - `200 OK`: Request berhasil dieksekusi.
  - `201 Created`: Entitas baru berhasil dibuat (misal registrasi).
  - `400 Bad Request`: Validasi payload gagal / input tidak sesuai skema.
  - `401 Unauthorized`: Token tidak valid, expired, atau tidak disertakan.
  - `403 Forbidden`: Pengguna tidak memiliki akses ke resource.
  - `404 Not Found`: Resource yang diminta tidak ditemukan.
  - `429 Too Many Requests`: Rate limit terlampaui.
  - `500 Internal Server Error`: Kesalahan server internal.

---

## 2. Authentication Endpoints

### 2.1. Register Account
- **Method & Route:** `POST /api/v1/auth/register`
- **Auth Required:** No (Public)
- **Request Body:**
  ```json
  {
    "full_name": "Reza Julianto",
    "email": "reza@example.com",
    "password": "SecurePassword123!"
  }
  ```
  *Validation Rules:* `full_name` (min 2 char), `email` (valid email format), `password` (min 8 char, minimal memuat 1 angka/simbol).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "c1f7b0a8-2947-4f81-9b16-8f203875bc01",
        "full_name": "Reza Julianto",
        "email": "reza@example.com",
        "role": "student"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5..."
    }
  }
  ```
- **Error Cases:** `400 Bad Request` (Invalid input), `409 Conflict` (`EMAIL_ALREADY_EXISTS`).

---

### 2.2. Login
- **Method & Route:** `POST /api/v1/auth/login`
- **Auth Required:** No (Public)
- **Request Body:**
  ```json
  {
    "email": "reza@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "c1f7b0a8-2947-4f81-9b16-8f203875bc01",
        "full_name": "Reza Julianto",
        "email": "reza@example.com",
        "role": "student"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5..."
    }
  }
  ```
- **Error Cases:** `401 Unauthorized` (`INVALID_CREDENTIALS`).

---

### 2.3. Get Current User Profile
- **Method & Route:** `GET /api/v1/auth/me`
- **Auth Required:** Yes (`student` / `admin`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f7b0a8-2947-4f81-9b16-8f203875bc01",
      "full_name": "Reza Julianto",
      "email": "reza@example.com",
      "role": "student",
      "created_at": "2026-09-02T08:00:00Z"
    }
  }
  ```

---

## 3. Course & Syllabus Endpoints (Free Navigation)

### 3.1. List Courses
- **Method & Route:** `GET /api/v1/courses`
- **Auth Required:** Optional / Public
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "d2a6e9f1-7c34-4a2e-8d9b-11f8e452a901",
        "title": "Confident English Speaking Foundation",
        "slug": "confident-english-speaking-foundation",
        "description": "Kuasai percakapan bahasa Inggris sehari-hari dengan berani tanpa cemas salah grammar.",
        "thumbnail_url": "/images/courses/speaking-foundation.png",
        "level": "beginner",
        "total_modules": 4,
        "total_lessons": 12
      }
    ]
  }
  ```

---

### 3.2. Get Course Detail & Full Syllabus
- **Method & Route:** `GET /api/v1/courses/:slug`
- **Auth Required:** Optional / Public (Menyertakan status progres jika user terautentikasi)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "d2a6e9f1-7c34-4a2e-8d9b-11f8e452a901",
      "title": "Confident English Speaking Foundation",
      "slug": "confident-english-speaking-foundation",
      "description": "Kuasai percakapan bahasa Inggris sehari-hari...",
      "level": "beginner",
      "user_progress_percentage": 25.0,
      "modules": [
        {
          "id": "m1111111-1111-1111-1111-111111111111",
          "title": "Module 1: Breaking the Fear Barrier",
          "slug": "breaking-the-fear-barrier",
          "order_index": 1,
          "lessons": [
            {
              "id": "l1111111-1111-1111-1111-111111111111",
              "title": "Lesson 1: The Mindset of Fluency over Perfection",
              "slug": "mindset-of-fluency",
              "order_index": 1,
              "youtube_video_id": "dQw4w9WgXcQ",
              "is_completed": true,
              "video_completed": true,
              "best_quiz_score": 100
            },
            {
              "id": "l2222222-2222-2222-2222-222222222222",
              "title": "Lesson 2: Daily Self-Introduction with Impact",
              "slug": "daily-self-introduction",
              "order_index": 2,
              "youtube_video_id": "eX2qmM7l4hw",
              "is_completed": false,
              "video_completed": false,
              "best_quiz_score": null
            }
          ]
        }
      ]
    }
  }
  ```

---

### 3.3. Enroll Course
- **Method & Route:** `POST /api/v1/courses/:courseId/enroll`
- **Auth Required:** Yes
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "enrollment_id": "e3333333-3333-3333-3333-333333333333",
      "course_id": "d2a6e9f1-7c34-4a2e-8d9b-11f8e452a901",
      "enrolled_at": "2026-09-02T08:30:00Z"
    }
  }
  ```

---

## 4. Lesson & Practice Endpoints

### 4.1. Get Lesson Details (Free Navigation Access)
- **Method & Route:** `GET /api/v1/lessons/:lessonId`
- **Auth Required:** Yes
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "l1111111-1111-1111-1111-111111111111",
      "title": "Lesson 1: The Mindset of Fluency over Perfection",
      "slug": "mindset-of-fluency",
      "youtube_video_id": "dQw4w9WgXcQ",
      "summary_content": "### Key Concepts\n- Fluency adalah menyampaikan makna...",
      "speaking_prompt": "Katakan: 'Hello, my name is Reza and I am practicing my English speaking every single day!'",
      "order_index": 1,
      "module_id": "m1111111-1111-1111-1111-111111111111",
      "course_id": "d2a6e9f1-7c34-4a2e-8d9b-11f8e452a901",
      "quiz": {
        "id": "q1111111-1111-1111-1111-111111111111",
        "title": "Checkpoint Quiz: Mindset of Fluency",
        "total_questions": 3,
        "passing_score": 70
      },
      "user_progress": {
        "video_completed": true,
        "is_completed": true,
        "best_quiz_score": 100,
        "total_quiz_attempts": 2
      }
    }
  }
  ```

---

### 4.2. Mark Video Completed
- **Method & Route:** `POST /api/v1/lessons/:lessonId/video-complete`
- **Auth Required:** Yes
- **Request Body:** `{}` (Optional metadata like playback duration)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "lesson_id": "l1111111-1111-1111-1111-111111111111",
      "video_completed": true,
      "is_completed": true,
      "best_quiz_score": 100,
      "message": "Status pemutaran video berhasil disimpan."
    }
  }
  ```

---

## 5. Checkpoint Quiz & Retake Endpoints (PRD-02 & PRD-03)

### 5.1. Get Quiz Questions (Anti-Cheat Payload)
- **Method & Route:** `GET /api/v1/quizzes/:quizId`
- **Auth Required:** Yes
- **Response `200 OK` (Note: `is_correct` DILINDUNGI & TIDAK DIKIRIM KE CLIENT):**
  ```json
  {
    "success": true,
    "data": {
      "id": "q1111111-1111-1111-1111-111111111111",
      "title": "Checkpoint Quiz: Mindset of Fluency",
      "passing_score": 70,
      "questions": [
        {
          "id": "q_q1",
          "order_index": 1,
          "question_text": "Apa fokus utama saat melatih speaking bahasa Inggris pemula?",
          "options": [
            { "id": "opt_1", "option_text": "Menghafal 16 tenses secara sempurna" },
            { "id": "opt_2", "option_text": "Menyampaikan pesan secara percaya diri dan jelas" },
            { "id": "opt_3", "option_text": "Menghindari berbicara sampai grammar 100% benar" }
          ]
        }
      ]
    }
  }
  ```

---

### 5.2. Submit Quiz Attempt
- **Method & Route:** `POST /api/v1/quizzes/:quizId/submit`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "answers": [
      {
        "question_id": "q_q1",
        "selected_option_id": "opt_2"
      }
    ]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "attempt_id": "att_98765432-1111-2222-3333-444455556666",
      "score": 100,
      "is_passed": true,
      "best_score": 100,
      "total_attempts": 1,
      "lesson_completion": {
        "video_completed": true,
        "is_completed": true,
        "completed_at": "2026-09-02T08:35:00Z"
      },
      "feedback": [
        {
          "question_id": "q_q1",
          "is_correct": true,
          "selected_option_id": "opt_2",
          "correct_option_id": "opt_2",
          "explanation": "Tepat! Prioritas utama adalah keberanian menyampaikan pesan."
        }
      ]
    }
  }
  ```

---

### 5.3. Get Quiz Attempt History
- **Method & Route:** `GET /api/v1/quizzes/:quizId/attempts`
- **Auth Required:** Yes
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "quiz_id": "q1111111-1111-1111-1111-111111111111",
      "best_score": 100,
      "has_passed": true,
      "total_attempts": 2,
      "attempts": [
        {
          "id": "att_2",
          "score": 100,
          "is_passed": true,
          "submitted_at": "2026-09-02T08:35:00Z"
        },
        {
          "id": "att_1",
          "score": 66,
          "is_passed": false,
          "submitted_at": "2026-09-02T08:20:00Z"
        }
      ]
    }
  }
  ```

---

## 6. Student Dashboard & Aggregated Progress Endpoints

### 6.1. Get Student Dashboard Overview
- **Method & Route:** `GET /api/v1/dashboard`
- **Auth Required:** Yes
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "full_name": "Reza Julianto",
        "email": "reza@example.com"
      },
      "enrolled_courses": [
        {
          "course_id": "d2a6e9f1-7c34-4a2e-8d9b-11f8e452a901",
          "course_title": "Confident English Speaking Foundation",
          "slug": "confident-english-speaking-foundation",
          "thumbnail_url": "/images/courses/speaking-foundation.png",
          "total_lessons": 12,
          "completed_lessons": 3,
          "progress_percentage": 25.0,
          "continue_learning_lesson": {
            "lesson_id": "l4444444-4444-4444-4444-444444444444",
            "title": "Lesson 4: Ordering Food in English",
            "slug": "ordering-food-in-english"
          }
        }
      ]
    }
  }
  ```
