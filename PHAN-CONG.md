# Phân công công việc — PawPass

Tài liệu ghi lại **ai phụ trách phần nào và đã đưa gì lên repo**, đúng như đã diễn ra.

> Web đang chạy: https://pawpass-hosothucung-web.vercel.app/
> Báo cáo nhóm: [README.md](README.md) · Tài liệu kỹ thuật: [docs/KY-THUAT.md](docs/KY-THUAT.md)

---

## 1. Thành viên và phần phụ trách

Nhóm chia dự án thành 5 phần theo lớp của ứng dụng. Mỗi người phụ trách một phần: đưa phần đó lên repo, đọc hiểu và trình bày được. Mã nguồn được viết với AI Coding Agent (Claude) theo tài liệu Step 1–2; xem mục **Khai báo sử dụng AI** trong README.

| # | Thành viên | MSSV | Phần phụ trách | File chính | Commit đưa lên (13/11/2026) |
| --- | --- | --- | --- | --- | --- |
| 1 | Nguyễn Hữu Triết (Leader) | 24090003 | Giao diện: các màn hình & hình ảnh | `public/index.html`, `public/assets/` | [`a735c4d`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/a735c4d) |
| 2 | Đinh Phùng Duy Huy | 24090016 | Phong cách CSS, cấu hình deploy & test giao diện | `public/css/app.css`, `tests/ui/run-ui.js`, `vercel.json`, `package.json`, `.gitignore`, `.env.example` | [`7cc1796`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/7cc1796), [`9328c46`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9328c46), [`5d98e0f`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/5d98e0f) — `app.css`, `run-ui.js` do Hữu Triết đưa vào đúng chỗ ([`9621df1`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/9621df1)) |
| 3 | Nguyễn Thế Dũng | 24090007 | Logic frontend | `public/js/app.js`, `public/js/runtime.js` | [`e5c84fa`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/e5c84fa) |
| 4 | Nguyễn Phước Thành Đạt | 24090026 | Backend API & bảo mật | `server/app.js`, `server/http.js`, `server/security.js`, `server/storage.js`, `server/local.js`, `api/index.js` | [`14d7456`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/14d7456) |
| 5 | Đào Duy Quang | 24090005 | Database, kiểm tra dữ liệu & test API | `db/schema.sql`, `server/schema.js`, `server/db.js`, `server/env.js`, `scripts/`, `public/js/validators.js`, `tests/api.test.js` | [`d98340c`](https://github.com/iceruychi-netizen/PawPass-Hosothucung/commit/d98340c) |

---

## 2. Việc của Leader (Nguyễn Hữu Triết)

Ngoài phần 1, Hữu Triết:

- Làm việc trực tiếp với AI Coding Agent qua 3 bước: prototype Step 1, tài liệu Step 2 (PRD, kiến trúc, ERD, API Docs), code Step 3.
- Chia dự án thành 5 phần, soạn tài liệu đọc hiểu cho từng người.
- Tạo project Vercel, gắn database Neon và kho Vercel Blob, đặt biến môi trường.
- Thử toàn bộ chức năng trên web thật, báo lỗi cho AI sửa và đưa các bản sửa lên repo (13/11, từ 20:13 đến 22:28): lỗi kết nối database, lỗi lưu ảnh, màn hình giật, lặp trang đăng nhập khi F5, web tải chậm, các mục Lighthouse.
- Đợt bổ sung theo đề bài môn học (20/11): Tailwind CSS, trang Giới thiệu và Liên hệ, Google Analytics, Sentry, báo cáo README, self-report.

---

## 3. Cách nhóm đã làm việc trên GitHub

- Cả nhóm làm trực tiếp trên nhánh `main`, **không dùng nhánh riêng, Issue hay Pull Request**.
- Mỗi người đưa phần của mình lên bằng "Add files via upload" trên giao diện web GitHub, tối 13/11/2026 (19:49 – 19:58).
- Các bản sửa sau đó do Hữu Triết đưa lên bằng GitHub Desktop.

**Rút kinh nghiệm cho lần sau:** tạo Issue cho từng việc, mỗi người làm trên nhánh riêng, mở Pull Request để người khác review trước khi gộp, đặt tên commit rõ ràng theo quy ước `feat:` / `fix:` / `docs:`, và commit đều trong suốt dự án thay vì dồn vào một buổi.
