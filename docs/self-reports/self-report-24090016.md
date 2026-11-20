# Self-Report — Final Project

---

## Thông tin cá nhân

| | |
|---|---|
| **Họ tên** | Đinh Phùng Duy Huy |
| **MSSV** | 24090016 |
| **Nhóm** | PawPass |
| **Vai trò trong nhóm** | Frontend — phần 2: CSS, cấu hình deploy, test giao diện |

---

## Task 1 — Planning & Setup

**Tuần:** Tuần 1, ngày 13/11

**Công việc đã làm:**

- Đọc tài liệu phần 2 và nhận phần cấu hình dự án.

**Bằng chứng đóng góp:**

- Không có commit riêng cho task này

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 2 — UI Implementation

**Tuần:** Tuần 1–2, ngày 13/11

**Công việc đã làm:**

- Đưa phần 2 lên repo: lần đầu upload `public/css/app.css`, `tests/ui/run-ui.js`, `package.json`, `vercel.json` nhưng bị lồng trong thư mục zip, nên đã xóa và upload lại `package.json`, `vercel.json`, `.gitignore`, `.env.example` vào đúng chỗ. Hai file `app.css` và `run-ui.js` sau đó được Hữu Triết đưa vào đúng vị trí ([`9621df1`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9621df1)).
- Đọc hiểu CSS responsive (3 khổ màn hình) và test giao diện bằng Playwright để trình bày.

**Bằng chứng đóng góp:**

- [`7cc1796`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/7cc1796) — upload phần 2 (bị lồng trong thư mục `2-phong-cach-cau-hinh-test-giao-dien_1/`)
- [`9328c46`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9328c46) — xóa thư mục upload nhầm
- [`5d98e0f`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/5d98e0f) — upload lại cấu hình đúng chỗ

**Khó khăn gặp phải:**

Lần đầu upload bị lồng cả thư mục zip (`2-phong-cach-cau-hinh-test-giao-dien_1/`) vào repo, phải xóa rồi upload lại đúng vị trí.

**Đánh giá bản thân:** 8/10

---

## Task 3 — Database Integration

**Tuần:** Tuần 2, ngày 13/11

**Công việc đã làm:**

- Đọc hiểu cấu hình Vercel (`vercel.json`: thư mục `public`, chuyển `/api/*` về một Function).

**Bằng chứng đóng góp:**

- Không có commit riêng cho task này

**Khó khăn gặp phải:**

—

**Đánh giá bản thân:** 8/10

---

## Task 4 — Optimization

**Tuần:** Tuần 2–3, ngày 13/11 – 20/11

**Công việc đã làm:**

- Đọc hiểu cách sửa giật bằng `transform`, cấu hình Tailwind (`tailwind.config.js`, `npm run build:css`).

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
| `public/css/app.css`, `tests/ui/run-ui.js`, `vercel.json`, `package.json`, Tailwind | Claude | Viết code | Đưa phần này lên repo ([`5d98e0f`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/5d98e0f)), đọc hiểu để trình bày được |

---

## Tổng Kết Đóng Góp Cá Nhân

**Tóm tắt những gì bạn đã đóng góp cho dự án:**

Mình phụ trách phần 2: CSS, cấu hình deploy và test giao diện. Mình đưa phần cấu hình (`package.json`, `vercel.json`, `.gitignore`, `.env.example`) lên repo; lần đầu upload nhầm cả thư mục zip nên phải xóa rồi upload lại. Mình đọc hiểu cách CSS chia 3 khổ màn hình và cách test giao diện tự bấm qua các trang. Mình học được cách đưa file lên GitHub đúng cấu trúc thư mục và cách Vercel dùng `vercel.json` để deploy.

**Ước tính % đóng góp so với cả nhóm:** ~15%

**Điểm tự đánh giá tổng thể:** 8/10
