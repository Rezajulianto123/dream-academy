# API Contracts & Specification - Dream Academy

> **Status:** Draft / Foundation  
> **Owner:** Architect Agent / Builder Agent  
> **Last Updated:** 2026-09-02

---

## 1. General Principles
- **Protocol:** HTTPS (RESTful API / JSON Payload)
- **Base URL:** `/api/v1`
- **Standard Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>`

---

## 2. Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Detail deskripsi error yang mudah dipahami.",
    "details": []
  }
}
```

---

## 3. Core Endpoint Catalog (MVP Foundation)

### Authentication (`/api/v1/auth`)
- `POST /auth/register` — Pendaftaran akun baru
- `POST /auth/login` — Login pengguna & penerbitan token JWT
- `POST /auth/refresh` — Refresh token akses
- `GET /auth/me` — Profil pengguna yang sedang login

### Courses (`/api/v1/courses`)
- `GET /courses` — Daftar kursus (dengan filter & pagination)
- `GET /courses/:id` — Detail kursus beserta silabus modul
- `POST /courses/:id/enroll` — Pendaftaran siswa ke dalam kursus

### Progress & Submissions (`/api/v1/progress`)
- `GET /progress/:courseId` — Status progres belajar per modul
- `POST /submissions/quiz` — Submit jawaban kuis & evaluasi otomatis
