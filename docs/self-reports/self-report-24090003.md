# Self-Report — Final Project

> Bản điền sẵn từ phân công và lịch sử commit. **Nguyễn Hữu Triết kiểm tra lại cho đúng sự thật**, điền các chỗ *(…)*, xóa các dòng `>` rồi commit.

---

## Thông tin cá nhân

| | |
|---|---|
| **Họ tên** | Nguyễn Hữu Triết |
| **MSSV** | 24090003 |
| **Nhóm** | PawPass |
| **Vai trò trong nhóm** | Leader — điều phối nhóm, làm việc với AI Coding Agent, deploy Vercel; phụ trách phần 1 (giao diện, hình ảnh, trang Giới thiệu / Liên hệ) |

---

## Task 1 — Planning & Setup

**Tuần:** Tuần 1, ngày 09/11 – 13/11

**Công việc đã làm:**

- Làm prototype Step 1 bằng Claude Design (09/11 – 11/11, nhiều vòng sửa) và viết tài liệu Step 2 (PRD, kiến trúc, ERD, API Docs) cùng AI (12/11).
- Lập kế hoạch Step 3, chia dự án thành 5 phần và phân công (`PHAN-CONG.md`, `PLAN.md`), soạn tài liệu đọc hiểu cho từng phần.
- Tạo repo GitHub, đưa phần giao diện lên đầu tiên; xử lý xung đột khi gộp code (merge conflict) trên GitHub Desktop. Nhóm làm trực tiếp trên `main`, chưa dùng nhánh riêng hay Pull Request.

**Bằng chứng đóng góp:**

- [`a735c4d`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/a735c4d) — đưa giao diện và hình ảnh lên repo
- [`3c64f7b`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/3c64f7b) — thêm PHAN-CONG.md, cập nhật README
- [`641a49f`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/641a49f) — gộp code khi bị xung đột
- [`4b37b3c`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/4b37b3c) — thêm PLAN.md, CLAUDE.md, unit test

**Khó khăn gặp phải:**

Lần đầu dùng GitHub theo nhóm: các bạn upload song song nên bị xung đột, có bạn upload nhầm thư mục; phải xem lại từng file để gộp đúng.

**Đánh giá bản thân:** 9/10

---

## Task 2 — UI Implementation

**Tuần:** Tuần 1–2, ngày 13/11 – 20/11

**Công việc đã làm:**

- Phần 1: `public/index.html` (các màn hình), `public/assets/` (ảnh minh họa WebP).
- Sửa lỗi giao diện khi chạy thật: màn hình giật khi rê chuột, lặp lại trang đăng nhập khi F5, ảnh tài liệu không hiện, màn hình chờ sau đăng nhập.
- Đợt bổ sung theo đề bài: trang Giới thiệu `public/gioi-thieu.html` và Liên hệ `public/lien-he.html` (Tailwind CSS), link từ ứng dụng.

**Bằng chứng đóng góp:**

- [`9725d89`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9725d89) — sửa lỗi lặp đăng nhập
- [`80bcfc0`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/80bcfc0) — sửa lỗi lag
- [`24daa6e`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/24daa6e) — sửa thẻ tài liệu trống (tải lại ảnh xem trước)
- [`c5c5461`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/c5c5461) — màn hình chờ đợi dữ liệu tải xong
- [`6058e8a`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/6058e8a) — màn hình chờ chạy mượt, không giật
- [`9621df1`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9621df1) — đưa `app.css` và `run-ui.js` của phần 2 vào đúng vị trí
- [`3553678`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/3553678) — đợt bổ sung 20/11: Tailwind CSS, trang Giới thiệu / Liên hệ, Google Analytics, Sentry, báo cáo README, self-report
- [`84b843c`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/84b843c) — sửa báo cáo và phân công cho đúng thực tế

**Khó khăn gặp phải:**

Hiệu ứng chó mèo chạy bị giật trên máy thật dù chạy thử thì ổn; phải đo lại và chuyển sang dùng `transform`. File CSS mới upload nhầm chỗ nên web vẫn chạy bản cũ, mất thời gian tìm ra.

**Đánh giá bản thân:** 9/10

---

## Task 3 — Database Integration

**Tuần:** Tuần 1, ngày 12/11 – 13/11

**Công việc đã làm:**

- Tạo database Neon (PostgreSQL) và kho Vercel Blob, gắn vào project Vercel, đặt biến môi trường (`DATABASE_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`).
- Kiểm tra toàn bộ chức năng trên web thật (thêm thú cưng, lần khám, mũi tiêm, tải giấy tờ) và báo lỗi để sửa.

**Bằng chứng đóng góp:**

- [`bb49ddf`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/bb49ddf) — sửa lỗi lưu ảnh lên Vercel Blob
- Web chạy: https://pawpass-hosothucung-web.vercel.app/

**Khó khăn gặp phải:**

Web báo "không kết nối được cơ sở dữ liệu", rồi thiếu `JWT_SECRET`, rồi kho ảnh Blob báo lỗi `access must be "public"` (do tạo kho Private) và sau đó thiếu token (Vercel đổi cách kết nối Blob). Phải đọc từng thông báo lỗi để sửa cấu hình.

**Đánh giá bản thân:** 9/10

---

## Task 4 — Optimization

**Tuần:** Tuần 2–3, ngày 13/11 – 20/11

**Công việc đã làm:**

- Chạy Lighthouse, sửa các mục bị trừ: ảnh WebP (1.040 KB → 196 KB), thẻ `<main>`, phông chữ và CSS không chặn hiển thị.
- Tìm nguyên nhân web chậm: máy chủ Vercel đặt ở Mỹ (iad1); thêm tải trang chủ trong 1 lần gọi, thu nhỏ ảnh trước khi tải lên.
- Đợt bổ sung: tích hợp Google Analytics và Sentry, viết lại README theo template báo cáo.

**Bằng chứng đóng góp:**

- [`ab67f70`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/ab67f70) — trang chủ tải trong 1 lần gọi (`/api/overview`), nút Thử lại
- [`15b8a0e`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/15b8a0e) — tải CSS không chặn hiển thị (Lighthouse)
- [`3553678`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/3553678) — Google Analytics, Sentry (`public/js/monitoring.js`, `server/monitor.js`)
- Ảnh WebP và thẻ `<main>` đã có từ lần đưa lên đầu tiên [`a735c4d`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/a735c4d)
- Ảnh Lighthouse trước (13/11): `docs/images/lighthouse-truoc-van-de.png`, `lighthouse-truoc-con-lai.png` · sau (20/11, 100/100/100/100): `docs/images/lighthouse-sau-desktop.jpg`, `lighthouse-sau-mobile.jpg`
- *(ảnh dashboard GA / Sentry)*

**Khó khăn gặp phải:**

Lighthouse vẫn báo mục đỏ sau khi sửa; phải phân biệt mục bị trừ điểm với mục chỉ mang tính thông tin.

**Đánh giá bản thân:** 9/10

---

## Task 5 — Peer Review

**Tuần:** Tuần 2, ngày 13/11 – 20/11

**Công việc đã làm:**

- Review web **nhóm 2 (Focus Space)**: dùng thử, góp ý tương tác với chú mèo cho sống động hơn và số lượng vật thể trong phòng.
- Góp ý cho **nhóm 5 (web bán quần áo)** về giao diện, thiết kế tổng thể và cách trình bày cho hợp mắt.
- Nhận 3 góp ý từ nhóm 2 cho PawPass: sửa 2 góp ý (màn hình chờ tải nền trang chính, F5 không còn nhảy qua trang đăng nhập), giữ nguyên 1 góp ý (kích thước chú mèo — linh vật của nhóm) và giải thích lý do.

**Bằng chứng đóng góp:**

- Bảng góp ý và cách xử lý: mục Task 5 trong `README.md`
- [`c5c5461`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/c5c5461), [`6058e8a`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/6058e8a) — màn hình chờ tải nền trang chính
- [`9725d89`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9725d89) — F5 giữ đúng trang đang xem

**Khó khăn gặp phải:**

*(Mô tả ngắn)*

**Đánh giá bản thân:** 9/10

---

## Khai báo sử dụng AI

> Dự án dùng Claude (Anthropic) làm AI Coding Agent (xem `CLAUDE.md`, `PLAN.md`). Ghi trung thực phần mình nhờ AI và phần mình tự làm; thầy sẽ hỏi để kiểm tra mức độ hiểu.

| Phần / file | Công cụ AI | AI làm gì | Tôi đã làm gì với phần đó |
|---|---|---|---|
| Phần lớn mã nguồn (giao diện, logic, API, test) và tài liệu | Claude | Viết code, tài liệu, test theo yêu cầu và tài liệu Step 1–2 | Đưa yêu cầu, thử trên web thật, báo lỗi, quyết định sửa gì; deploy và cấu hình Vercel / Neon / Blob |

---

## Tổng Kết Đóng Góp Cá Nhân

**Tóm tắt những gì bạn đã đóng góp cho dự án:**

Tôi điều phối cả nhóm từ prototype, tài liệu Step 2 đến khi web chạy thật trên Vercel. Tôi làm việc trực tiếp với AI Coding Agent: đưa yêu cầu, thử trên web thật, báo lỗi và kiểm tra lại từng bản sửa. Phần tôi tự hào nhất là xử lý được chuỗi lỗi khi deploy (database, JWT, kho ảnh) và làm web hết giật, hết chậm. Tôi học được cách deploy một web có database, cách đọc thông báo lỗi để tìm nguyên nhân, và cách làm việc nhóm trên GitHub.

**Ước tính % đóng góp so với cả nhóm:** ~40%

**Điểm tự đánh giá tổng thể:** 9/10
