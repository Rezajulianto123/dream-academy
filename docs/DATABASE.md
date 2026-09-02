# Database Schema & Data Models - Dream Academy

> **Status:** Draft / Foundation  
> **Owner:** Architect Agent / Builder Agent  
> **Last Updated:** 2026-09-02

---

## 1. Database Engine & Conventions
- **RDBMS:** PostgreSQL 16+
- **Naming Conventions:**
  - Table names: `snake_case`, plural (e.g., `users`, `courses`, `enrollments`).
  - Column names: `snake_case`, singular (e.g., `created_at`, `user_id`, `is_active`).
  - Primary Keys: UUID v4 (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`).
  - Foreign Keys: `<singular_table_name>_id` (e.g., `user_id`, `course_id`).
  - Timestamps: `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`.

---

## 2. Core Entity Relationship Diagram (ERD Concept)

```mermaid
erDiagram
    USERS ||--o{ ENROLLMENTS : has
    USERS ||--o{ SUBMISSIONS : submits
    COURSES ||--o{ MODULES : contains
    COURSES ||--o{ ENROLLMENTS : includes
    MODULES ||--o{ LESSONS : contains
    LESSONS ||--o{ QUIZZES : provides
    QUIZZES ||--o{ SUBMISSIONS : records

    USERS {
        uuid id PK
        string email UK
        string name
        string role
        timestamp created_at
        timestamp updated_at
    }

    COURSES {
        uuid id PK
        string title
        string slug UK
        text description
        string level
        boolean is_published
        timestamp created_at
    }

    MODULES {
        uuid id PK
        uuid course_id FK
        string title
        int order_index
    }

    LESSONS {
        uuid id PK
        uuid module_id FK
        string title
        text content
        int order_index
    }
```

---

## 3. Migration & Version Control Rules
- Setiap perubahan skema **wajib** menggunakan migration tool (misal: Prisma Migrate, Drizzle Kit, Alembic).
- Dilarang mengubah skema secara manual langsung di production database.
- Migration script harus bersifat idempotent dan menyertakan rollback / down migration jika memungkinkan.
