# Self-Report — Final Project

---

## Thông tin cá nhân

| | |
|---|---|
| **Họ tên** | Nguyễn Phước Thành Đạt |
| **MSSV** | 24090026 |
| **Nhóm** | PawPass |
| **Vai trò trong nhóm** | Backend — phần 4: API, bảo mật, lưu tệp |

---

## Task 1 — Planning & Setup

**Tuần:** Tuần 1, ngày 13/11

**Công việc đã làm:**

- Đọc tài liệu phần 4 và API Docs Step 2.

**Bằng chứng đóng góp:**

- Không có commit riêng cho task này

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 2 — UI Implementation

**Tuần:** Tuần 1–2

**Công việc đã làm:**

- Không phụ trách giao diện.

**Bằng chứng đóng góp:**

- Không có commit riêng cho task này

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** —

---

## Task 3 — Database Integration

**Tuần:** Tuần 1–2, ngày 13/11

**Công việc đã làm:**

- Đưa phần 4 lên repo: `server/app.js` (các endpoint API), `server/http.js`, `server/security.js` (băm mật khẩu, token đăng nhập), `server/storage.js` (Vercel Blob), `server/local.js`, `api/index.js`, `README.md`.
- Đọc hiểu cách API kiểm tra quyền sở hữu (người khác mở dữ liệu bị chặn 403) để trình bày.

**Bằng chứng đóng góp:**

- [`14d7456`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/14d7456) — upload phần 4 — backend

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 4 — Optimization

**Tuần:** Tuần 2–3, ngày 13/11 – 20/11

**Công việc đã làm:**

- Đọc hiểu `GET /api/overview` (trang chủ trong 1 lần gọi) và `server/monitor.js` (gửi lỗi máy chủ lên Sentry).

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
| `server/*.js`, `api/index.js` | Claude | Viết code API, bảo mật, lưu tệp | Đưa phần này lên repo ([`14d7456`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/14d7456)), đọc hiểu để trình bày được |

---

## Tổng Kết Đóng Góp Cá Nhân

**Tóm tắt những gì bạn đã đóng góp cho dự án:**

Mình phụ trách phần 4: backend API và bảo mật. Mình đưa các file máy chủ (`server/`, `api/index.js`) và README đầu tiên lên repo, đọc hiểu cách API kiểm tra token đăng nhập và quyền sở hữu (người khác mở dữ liệu bị chặn 403). Mình học được vì sao mật khẩu phải được băm chứ không lưu dạng chữ thường.

**Ước tính % đóng góp so với cả nhóm:** ~15%

**Điểm tự đánh giá tổng thể:** 8/10
