# Self-Report — Final Project

---

## Thông tin cá nhân

| | |
|---|---|
| **Họ tên** | Đào Duy Quang |
| **MSSV** | 24090005 |
| **Nhóm** | PawPass |
| **Vai trò trong nhóm** | Backend — phần 5: database, kiểm tra dữ liệu, test API |

---

## Task 1 — Planning & Setup

**Tuần:** Tuần 1, ngày 13/11

**Công việc đã làm:**

- Đọc ERD 5 bảng trong tài liệu Step 2 và tài liệu phần 5.

**Bằng chứng đóng góp:**

- Không có commit riêng cho task này

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 2 — UI Implementation

**Tuần:** Tuần 1–2

**Công việc đã làm:**

- Quy tắc kiểm tra dữ liệu dùng chung cho form và máy chủ: `public/js/validators.js`.

**Bằng chứng đóng góp:**

- `public/js/validators.js` nằm trong commit [`d98340c`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/d98340c) (xem Task 3)

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 3 — Database Integration

**Tuần:** Tuần 1–2, ngày 13/11

**Công việc đã làm:**

- Đưa phần 5 lên repo: `db/schema.sql`, `server/schema.js`, `server/db.js` (kết nối PostgreSQL), `server/env.js`, `scripts/`, `public/js/validators.js`, `tests/api.test.js`.
- Đọc hiểu các bảng, khóa ngoại xóa dây chuyền, và các test API để trình bày.

**Bằng chứng đóng góp:**

- [`d98340c`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/d98340c) — upload phần 5 — database và test (tài khoản GitHub `hhuy82571-alt`)

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 4 — Optimization

**Tuần:** Tuần 2–3, ngày 13/11 – 20/11

**Công việc đã làm:**

- Đọc hiểu 3 tầng test: unit (`tests/unit/`), integration (`tests/api.test.js`), E2E (`tests/ui/run-ui.js`).

**Bằng chứng đóng góp:**

- Không có commit riêng cho task này

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 5 — Peer Review

**Tuần:** —

**Công việc đã làm:**

Không tham gia trực tiếp. Phần review nhóm 2, nhóm 5 và xử lý góp ý do Hữu Triết thực hiện (xem Task 5 trong `README.md`).

**Bằng chứng đóng góp:**

—

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** —

---

## Khai báo sử dụng AI

| Phần / file | Công cụ AI | AI làm gì | Tôi đã làm gì với phần đó |
|---|---|---|---|
| `db/schema.sql`, `server/db.js`, `public/js/validators.js`, `tests/` | Claude | Viết code và test | Đưa phần này lên repo ([`d98340c`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/d98340c)), đọc hiểu để trình bày được |

---

## Tổng Kết Đóng Góp Cá Nhân

**Tóm tắt những gì bạn đã đóng góp cho dự án:**

Mình phụ trách phần 5: database, kiểm tra dữ liệu và test API. Mình đưa schema 5 bảng, kết nối database, quy tắc kiểm tra dữ liệu và test API lên repo (tài khoản `hhuy82571-alt`), đọc hiểu các bảng và khóa ngoại xóa dây chuyền. Mình học được cách thiết kế bảng theo ERD và cách viết test để tự kiểm tra API.

**Ước tính % đóng góp so với cả nhóm:** ~15%

**Điểm tự đánh giá tổng thể:** 8/10
