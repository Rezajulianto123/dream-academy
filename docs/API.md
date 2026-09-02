# RESTful API Contracts & Specification — Dream Academy

> **Version:** 1.1 (MVP API Baseline)  
> **Status:** Approved / Ready for Builder Implementation  
> **Author:** Architect Agent  
> **Base URL:** `/api/v1`  
> **Protocol:** HTTPS / JSON  
> **Last Updated:** 2026-09-02  
> **Reference Document:** [`docs/PRD.md`](./PRD.md) v1.1, [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md), & [`docs/DATABASE.md`](./DATABASE.md)

---

## 1. Global Conventions & Standards

### 1.1. Request Headers
| Header | Type | Description |
| :--- | :--- | :--- |
| `Content-Type` | `string` | Must be `application/json` for all POST/PUT/PATCH requests |
| `Authorization` | `string` | `Bearer <JWT_ACCESS_TOKEN>` for protected routes |
| `Accept` | `string` | `application/json` |

### 1.2. Standard Response Envelopes

#### Success Envelope (Single Entity)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

#### Success Envelope (Paginated List)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3,
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

#### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested lesson was not found.",
    "details": [],
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

### 1.3. Standard HTTP Status Codes & Error Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request` (`VALIDATION_ERROR`, `INVALID_PAYLOAD`): Schema validation failed.
- `401 Unauthorized` (`UNAUTHORIZED`, `TOKEN_EXPIRED`): Authentication required or token invalid.
- `403 Forbidden` (`FORBIDDEN`): Insufficient permissions.
- `404 Not Found` (`RESOURCE_NOT_FOUND`): Target entity does not exist.
- `409 Conflict` (`EMAIL_ALREADY_EXISTS`, `DUPLICATE_ENTRY`): Unique constraint violation.
- `422 Unprocessable Entity` (`BUSINESS_RULE_VIOLATION`): Domain rule failed.
- `500 Internal Server Error` (`INTERNAL_SERVER_ERROR`): Unhandled server exception.

---

## 2. Authentication Subsystem (`/api/v1/auth`)

### 2.1. `POST /api/v1/auth/register`
Creates a new student account.

- **Access:** Public
- **Request Body:**
```json
{
  "full_name": "Ahmad Fauzi",
  "email": "ahmad.fauzi@example.com",
  "password": "SecurePassword123!"
}
```
- **Validation Rules:**
  - `full_name`: String, 2–150 characters, trimmed.
  - `email`: Valid email format, lowercase.
  - `password`: String, min 8 characters.
- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "ahmad.fauzi@example.com",
      "full_name": "Ahmad Fauzi",
      "role": "student",
      "avatar_url": null,
      "created_at": "2026-09-02T02:30:00.000Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "expires_in": 900
    }
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```
- **Errors:**
  - `409 Conflict`: `{"code": "EMAIL_ALREADY_EXISTS", "message": "Email is already registered."}`
  - `400 Bad Request`: `{"code": "VALIDATION_ERROR", "message": "Invalid password format."}`

---

### 2.2. `POST /api/v1/auth/login`
Authenticates a user and issues JWT tokens.

- **Access:** Public
- **Request Body:**
```json
{
  "email": "ahmad.fauzi@example.com",
  "password": "SecurePassword123!"
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "ahmad.fauzi@example.com",
      "full_name": "Ahmad Fauzi",
      "role": "student",
      "avatar_url": null
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
      "expires_in": 900
    }
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```
- **Errors:**
  - `401 Unauthorized`: `{"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password."}`

---

### 2.3. `POST /api/v1/auth/refresh`
Refreshes an expired access token using a valid refresh token.

- **Access:** Public (Requires Refresh Token)
- **Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5c..."
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "expires_in": 900
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

### 2.4. `GET /api/v1/auth/me`
Fetches the currently authenticated user's profile.

- **Access:** Protected (`Bearer Token`)
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "email": "ahmad.fauzi@example.com",
    "full_name": "Ahmad Fauzi",
    "role": "student",
    "avatar_url": null,
    "created_at": "2026-09-02T02:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

## 3. Student Dashboard Subsystem (`/api/v1/dashboard`)

### 3.1. `GET /api/v1/dashboard/summary`
Provides aggregated learning statistics, enrolled courses with progress, and the *"Continue Learning"* resume pointer.

- **Access:** Protected (`Bearer Token`)
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "student_name": "Ahmad Fauzi",
    "total_courses_enrolled": 1,
    "total_lessons_completed": 3,
    "enrolled_courses": [
      {
        "course_id": "c1111111-0000-0000-0000-000000000001",
        "title": "Speaking Confidence & Fluency Mastery",
        "slug": "speaking-confidence-mastery",
        "thumbnail_url": "https://assets.dreamacademy.id/thumbnails/speaking-1.jpg",
        "level": "beginner",
        "progress_percentage": 30.00,
        "is_completed": false,
        "resume_lesson": {
          "lesson_id": "l2222222-0000-0000-0000-000000000004",
          "title": "Mastering Everyday Small Talk",
          "slug": "everyday-small-talk",
          "module_title": "Module 2: Practical Conversational Drills",
          "last_accessed_at": "2026-09-02T02:15:00.000Z"
        }
      }
    ],
    "available_courses": [
      {
        "id": "c1111111-0000-0000-0000-000000000002",
        "title": "Professional English for Job Interviews",
        "slug": "professional-interview-prep",
        "thumbnail_url": "https://assets.dreamacademy.id/thumbnails/interview-1.jpg",
        "level": "intermediate",
        "total_modules": 4,
        "total_lessons": 12,
        "is_enrolled": false
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

## 4. Course Catalog & Free Navigation Subsystem (`/api/v1/courses`)

### 4.1. `GET /api/v1/courses`
Lists published courses with optional filtering and pagination.

- **Access:** Public / Optional Auth (includes `is_enrolled` if authenticated)
- **Query Parameters:**
  - `level`: `string` (`beginner` | `intermediate` | `advanced`)
  - `search`: `string`
  - `page`: `number` (default: 1)
  - `limit`: `number` (default: 10)
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c1111111-0000-0000-0000-000000000001",
      "title": "Speaking Confidence & Fluency Mastery",
      "slug": "speaking-confidence-mastery",
      "description": "Overcome speaking anxiety and build conversational fluency.",
      "thumbnail_url": "https://assets.dreamacademy.id/thumbnails/speaking-1.jpg",
      "level": "beginner",
      "total_modules": 3,
      "total_lessons": 10,
      "is_enrolled": true,
      "progress_percentage": 30.00
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1,
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

### 4.2. `GET /api/v1/courses/:idOrSlug`
Retrieves full syllabus hierarchy for free navigation.

- **Access:** Public / Optional Auth (includes user progress per lesson if authenticated)
- **URL Parameters:**
  - `idOrSlug`: Course UUID or slug.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "c1111111-0000-0000-0000-000000000001",
    "title": "Speaking Confidence & Fluency Mastery",
    "slug": "speaking-confidence-mastery",
    "description": "Overcome speaking anxiety and build conversational fluency.",
    "thumbnail_url": "https://assets.dreamacademy.id/thumbnails/speaking-1.jpg",
    "level": "beginner",
    "is_enrolled": true,
    "progress_percentage": 30.00,
    "modules": [
      {
        "id": "m1111111-0000-0000-0000-000000000001",
        "title": "Module 1: Mindset & Overcoming Fear",
        "description": "Break down psychological barriers to speaking.",
        "order_index": 1,
        "lessons": [
          {
            "id": "l2222222-0000-0000-0000-000000000001",
            "title": "Lesson 1.1: Embracing Imperfect English",
            "slug": "embracing-imperfect-english",
            "duration_seconds": 480,
            "order_index": 1,
            "user_progress": {
              "video_completed": true,
              "best_quiz_score": 100.00,
              "is_completed": true
            }
          },
          {
            "id": "l2222222-0000-0000-0000-000000000002",
            "title": "Lesson 1.2: Confident Self-Introduction",
            "slug": "confident-self-introduction",
            "duration_seconds": 600,
            "order_index": 2,
            "user_progress": {
              "video_completed": true,
              "best_quiz_score": 60.00,
              "is_completed": false
            }
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

### 4.3. `POST /api/v1/courses/:id/enroll`
Enrolls the student into a course (Free Access for MVP).

- **Access:** Protected (`Bearer Token`)
- **URL Parameters:**
  - `id`: Course UUID.
- **Success Response (`200 OK` or `201 Created`):**
```json
{
  "success": true,
  "data": {
    "enrollment_id": "e1111111-0000-0000-0000-000000000001",
    "course_id": "c1111111-0000-0000-0000-000000000001",
    "progress_percentage": 0.00,
    "enrolled_at": "2026-09-02T02:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

## 5. Lesson Subsystem (`/api/v1/lessons`)

### 5.1. `GET /api/v1/lessons/:id`
Retrieves comprehensive lesson content for the learning viewer (video, summary, vocabulary, speaking practice, and navigation pointers).

- **Access:** Protected (`Bearer Token`)
- **URL Parameters:**
  - `id`: Lesson UUID.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "l2222222-0000-0000-0000-000000000001",
    "module_id": "m1111111-0000-0000-0000-000000000001",
    "course_id": "c1111111-0000-0000-0000-000000000001",
    "title": "Lesson 1.1: Embracing Imperfect English",
    "slug": "embracing-imperfect-english",
    "youtube_video_id": "dQw4w9WgXcQ",
    "video_duration_seconds": 480,
    "summary_content": "### Key Takeaways\n1. Communication beats perfection.\n2. Native speakers value clarity over perfect grammar.",
    "key_vocabulary": [
      {
        "term": "Fluency",
        "phonetic": "/ˈfluː.ən.si/",
        "definition": "The ability to speak or write easily and smoothly.",
        "example": "He speaks with great fluency and confidence."
      }
    ],
    "speaking_scenarios": [
      {
        "scenario_title": "Ordering Coffee Confidently",
        "role_description": "You are at a local cafe in Melbourne.",
        "shadowing_prompt": "Hi, could I please get an oat latte with one sugar, to go?",
        "tips": "Pay attention to the rising intonation on 'latte'."
      }
    ],
    "speaking_tips": "Breathe deeply before speaking. It is okay to pause for 2 seconds to gather your thoughts.",
    "user_progress": {
      "video_completed": true,
      "video_completed_at": "2026-09-02T02:10:00.000Z",
      "best_quiz_score": 80.00,
      "is_completed": true,
      "completed_at": "2026-09-02T02:15:00.000Z"
    },
    "navigation": {
      "prev_lesson_id": null,
      "next_lesson_id": "l2222222-0000-0000-0000-000000000002"
    }
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

### 5.2. `POST /api/v1/lessons/:id/video-complete`
Marks the YouTube video as completed for the current user and triggers progress engine evaluation.

- **Access:** Protected (`Bearer Token`)
- **URL Parameters:**
  - `id`: Lesson UUID.
- **Request Body (Optional metadata):**
```json
{
  "watch_duration_seconds": 450
}
```
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "lesson_id": "l2222222-0000-0000-0000-000000000001",
    "video_completed": true,
    "best_quiz_score": 60.00,
    "is_completed": false,
    "completion_requirements": {
      "video_condition_met": true,
      "quiz_condition_met": false,
      "passing_score": 70
    },
    "course_progress_percentage": 25.00
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

## 6. Quiz & Retake Evaluation Subsystem (`/api/v1/lessons/:id/quiz`)

### 6.1. `GET /api/v1/lessons/:id/quiz`
Fetches the checkpoint quiz questions and options for a lesson. **Never exposes correct answer flags.**

- **Access:** Protected (`Bearer Token`)
- **URL Parameters:**
  - `id`: Lesson UUID.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "q1111111-0000-0000-0000-000000000001",
    "lesson_id": "l2222222-0000-0000-0000-000000000001",
    "title": "Checkpoint Quiz: Lesson 1.1",
    "description": "Answer all 3 questions. Minimum passing score is 70%.",
    "passing_score": 70,
    "user_summary": {
      "total_attempts": 2,
      "best_score": 66.67,
      "is_passed": false
    },
    "questions": [
      {
        "id": "qk111111-0000-0000-0000-000000000001",
        "question_text": "What is the primary goal when speaking in a conversation?",
        "order_index": 1,
        "options": [
          {
            "id": "qo111111-0000-0000-0000-000000000001",
            "option_text": "Using the most complex grammatical structures",
            "order_index": 1
          },
          {
            "id": "qo111111-0000-0000-0000-000000000002",
            "option_text": "Delivering your message clearly and building understanding",
            "order_index": 2
          },
          {
            "id": "qo111111-0000-0000-0000-000000000003",
            "option_text": "Speaking with a 100% native British accent",
            "order_index": 3
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

### 6.2. `POST /api/v1/lessons/:id/quiz/submit`
Submits user answers for server-side evaluation, records the attempt, calculates score, updates best score, and triggers the progress engine.

- **Access:** Protected (`Bearer Token`)
- **URL Parameters:**
  - `id`: Lesson UUID.
- **Request Body:**
```json
{
  "answers": [
    {
      "question_id": "qk111111-0000-0000-0000-000000000001",
      "selected_option_id": "qo111111-0000-0000-0000-000000000002"
    },
    {
      "question_id": "qk111111-0000-0000-0000-000000000002",
      "selected_option_id": "qo111111-0000-0000-0000-000000000006"
    },
    {
      "question_id": "qk111111-0000-0000-0000-000000000003",
      "selected_option_id": "qo111111-0000-0000-0000-000000000009"
    }
  ]
}
```
- **Success Response (`200 OK` or `201 Created`):**
```json
{
  "success": true,
  "data": {
    "attempt_id": "qa111111-0000-0000-0000-000000000003",
    "score": 100.00,
    "total_questions": 3,
    "correct_answers": 3,
    "is_passed": true,
    "best_quiz_score": 100.00,
    "lesson_progress": {
      "video_completed": true,
      "best_quiz_score": 100.00,
      "is_completed": true,
      "completed_at": "2026-09-02T02:30:00.000Z"
    },
    "course_progress_percentage": 50.00,
    "results_breakdown": [
      {
        "question_id": "qk111111-0000-0000-0000-000000000001",
        "question_text": "What is the primary goal when speaking in a conversation?",
        "selected_option_id": "qo111111-0000-0000-0000-000000000002",
        "correct_option_id": "qo111111-0000-0000-0000-000000000002",
        "is_correct": true,
        "explanation": "Clear message delivery is the core purpose of communication."
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

### 6.3. `GET /api/v1/lessons/:id/quiz/attempts`
Lists historical quiz attempts for the current user.

- **Access:** Protected (`Bearer Token`)
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "attempt_id": "qa111111-0000-0000-0000-000000000003",
      "score": 100.00,
      "correct_answers": 3,
      "total_questions": 3,
      "is_passed": true,
      "created_at": "2026-09-02T02:30:00.000Z"
    },
    {
      "attempt_id": "qa111111-0000-0000-0000-000000000002",
      "score": 66.67,
      "correct_answers": 2,
      "total_questions": 3,
      "is_passed": false,
      "created_at": "2026-09-02T02:20:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```

---

## 7. Progress & Reporting Subsystem (`/api/v1/progress`)

### 7.1. `GET /api/v1/courses/:id/progress`
Returns detailed progress metrics across all modules and lessons for an enrolled student.

- **Access:** Protected (`Bearer Token`)
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "course_id": "c1111111-0000-0000-0000-000000000001",
    "total_lessons": 10,
    "completed_lessons": 5,
    "progress_percentage": 50.00,
    "is_course_completed": false,
    "modules_progress": [
      {
        "module_id": "m1111111-0000-0000-0000-000000000001",
        "title": "Module 1: Mindset & Overcoming Fear",
        "total_lessons": 3,
        "completed_lessons": 3,
        "progress_percentage": 100.00,
        "is_completed": true
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-02T02:30:00.000Z"
  }
}
```
