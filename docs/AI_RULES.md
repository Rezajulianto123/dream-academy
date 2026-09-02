# AI Engineering Constitution & Operating Rules

> **Status:** MANDATORY / NON-NEGOTIABLE  
> **Audience:** Semua AI Agent (Product, Architect, Builder, QA, Chief of Staff) & Kontributor Sistem

Dokumen ini adalah konstitusi rekayasa perangkat lunak (*Engineering Constitution*) untuk seluruh AI Agent yang beroperasi di repositori **Dream Academy**. Setiap tindakan, pembuatan kode, perubahan konfigurasi, atau refactoring wajib mematuhi aturan di bawah ini.

---

## 1. Prinsip Utama & Keselamatan (*Core Safety & Philosophy*)

1. **Baca Dokumentasi Sebelum Bertindak:**  
   Agent **wajib** membaca dan memahami dokumentasi yang relevan (`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, dan `docs/AI_RULES.md`) sebelum merencanakan atau melakukan modifikasi kode.
2. **Kerahasiaan Kredensial & Secrets (Zero Leakage):**  
   **DILARANG KERAS** menuliskan, mengekspos, atau melakukan commit terhadap API key, token autentikasi, private key, secret password, atau kredensial sensitif lainnya ke dalam kode, pesan commit, issue, atau log. Selalu gunakan environment variables (`.env`).
3. **Eskalasi Ambiguitas & Keputusan Berdampak Besar:**  
   Jika requirement produk, spesifikasi teknis, atau implikasi arsitektur bersifat ambigu dan keputusan tersebut memiliki dampak besar (*high impact/breaking changes*), **BERHENTI SEGERA** dan minta keputusan/konfirmasi dari Human Founder.

---

## 2. Integritas Arsitektur & Fungsionalitas (*Architecture Integrity*)

4. **Jangan Menghapus Fungsionalitas Tanpa Persetujuan:**  
   Dilarang menghapus fitur, fungsi yang sudah berjalan, atau deprecate komponen yang ada tanpa persetujuan (*explicit approval*) dari Human Founder / Architect Agent.
5. **Jangan Mengubah Arsitektur Secara Sepihak:**  
   Dilarang melakukan perubahan fundamental pada arsitektur sistem, struktur database, atau teknologi inti tanpa review dan persetujuan tertulis.
6. **Prioritaskan Komponen yang Sudah Ada (*Reuse First / DRY*):**  
   Selalu periksa dan gunakan komponen UI, modul utilitas, helper functions, dan pustaka yang sudah tersedia sebelum membuat yang baru. Hindari duplikasi logika.
7. **Anti-Halusinasi & Ketepatan Fakta:**  
   Dilarang mengarang (*hallucinate*) fungsionalitas, endpoint API, fungsi library eksternal, atau struktur file yang tidak nyata. Semua referensi kode wajib diverifikasi keakuratannya.

---

## 3. Disiplin Pengembangan Kode & Git Workflow (*Branching & Code Hygiene*)

8. **Larangan Direct Push ke `main`:**  
   Dilarang bekerja atau melakukan commit langsung pada branch `main` untuk *feature development*. Branch `main` harus selalu dalam kondisi stabil dan siap deploy (*deployable*).
9. **Gunakan Feature Branch:**  
   Setiap task atau fitur baru harus dikerjakan pada branch terpisah dengan penamaan konvensional:
   - `feature/<nama-fitur>`
   - `fix/<nama-bug>`
   - `docs/<nama-dokumen>`
   - `refactor/<nama-modul>`
10. **Perubahan Kecil & Terfokus (*Atomic & Focused Changes*):**  
    Setiap perubahan harus berukuran kecil, terisolasi, dan fokus pada satu tanggung jawab spesifik (*Single Responsibility Principle*). Hindari PR raksasa yang menggabungkan banyak hal unrelated.

---

## 4. Kualitas, Pengujian, & Acceptance Criteria (*Testing & Quality Assurance*)

11. **Wajib Memiliki Acceptance Criteria:**  
    Setiap fitur atau sub-task yang dikerjakan wajib memiliki kriteria penerimaan (*Acceptance Criteria*) yang jelas, objektif, dan dapat diuji.
12. **Wajib Menyertakan Pengujian (*Testing Required*):**  
    Setiap perubahan kode fungsional wajib disertai dengan unit test atau integration test yang relevan di direktori `tests/`. Seluruh pengujian harus dipastikan lolos (*green*) sebelum membuat Pull Request.
13. **Larangan Perubahan Langsung di Production:**  
    Dilarang keras melakukan manipulasi data, hotfix tidak terdokumentasi, atau perubahan langsung pada lingkungan production. Semua perubahan wajib melalui alur PR dan CI/CD.

---

## 5. Ringkasan Checklist Sebelum Mengajukan Perubahan

Sebelum membuat Pull Request atau menyelesaikan task, pastikan:
- [ ] Dokumentasi terkait telah dibaca dan dipahami
- [ ] Bekerja pada feature branch yang sesuai
- [ ] Tidak ada hardcoded credentials atau tokens
- [ ] Tidak ada fungsionalitas lama yang terhapus/rusak tanpa izin
- [ ] Utilitas yang sudah ada dimanfaatkan secara optimal
- [ ] Acceptance criteria terpenuhi seutuhnya
- [ ] Unit/integration test telah dibuat dan lolos pengujian lokal
- [ ] PR template diisi secara lengkap dan jelas
