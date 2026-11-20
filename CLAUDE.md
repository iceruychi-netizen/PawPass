# CLAUDE.md — Rule + Context cho AI Coding Agent

File này được AI Coding Agent (Claude Code, Cursor…) đọc trước khi làm việc trong repo PawPass.
Nó là phần **Rule + Skill + Context** trong quy trình Step 3 của nhóm. Kế hoạch: [`PLAN.md`](PLAN.md).

## Context — dự án là gì

PawPass là web "sổ hộ chiếu thú cưng": một người dùng quản lý nhiều thú cưng, mỗi bé có hồ sơ, lần khám sức khỏe, mũi tiêm và giấy tờ (JPG/PNG/PDF).

Tài liệu gốc (nguồn sự thật, theo thứ tự ưu tiên):
1. **Step 1** — prototype giao diện (`public/index.html` giữ nguyên thiết kế này)
2. **Step 2** — PRD, kiến trúc, ERD, API Docs
3. `PLAN.md` — kế hoạch triển khai theo phase

## Công nghệ

| Phần | Dùng | Ghi chú |
| --- | --- | --- |
| Frontend | HTML + CSS + JavaScript thuần; Tailwind CSS cho trang Giới thiệu / Liên hệ | Không framework. Template `sc-if` / `sc-for` / `{{...}}` do `public/js/runtime.js` hiển thị. Tailwind chỉ quét `gioi-thieu.html`, `lien-he.html`, `js/site.js`; sửa class xong chạy `npm run build:css` |
| Backend | Node.js 20+, module `http` | Không Express. Mọi request `/api/*` vào `api/index.js` (Vercel Function) |
| Database | PostgreSQL (Neon) qua `pg` | 5 bảng theo ERD, `server/schema.js` phải giống `db/schema.sql` |
| Lưu tệp | Vercel Blob (deploy), `uploads/` (máy cá nhân) | Tài liệu chỉ tải qua API có kiểm tra quyền |
| Deploy | Vercel | Không có Build Command, phục vụ thư mục `public/` |

## Cấu trúc thư mục

```
api/index.js          → Vercel Function (gọi server/app.js)
server/               → app.js (endpoint), http.js, db.js, security.js, storage.js, schema.js, env.js, local.js
public/               → index.html, css/app.css, js/{app,runtime,validators}.js, assets/
db/schema.sql         → ERD dạng SQL
scripts/              → migrate.js, seed.js, psql-driver.js (chỉ để test offline)
tests/unit/           → unit test (không cần database)
tests/api.test.js     → integration test trên PostgreSQL thật
tests/ui/run-ui.js    → E2E test bằng Playwright
```

## Rule — bắt buộc

**Phạm vi**
- Chỉ làm những gì có trong Step 1–2 và `PLAN.md`. **Không** thêm bác sĩ thú y, đặt lịch, thanh toán, chợ mua bán.
- Muốn đổi thiết kế, ERD hoặc API so với Step 2: **dừng lại, báo cho nhóm trước**, rồi ghi thay đổi vào `PLAN.md` và bảng "Lịch sử chỉnh sửa" trong `README.md`.

**Bảo mật**
- Không bao giờ ghi secret (`JWT_SECRET`, chuỗi kết nối database, token Blob) vào mã nguồn, README, test hay commit. Secret chỉ lấy từ biến môi trường.
- Mật khẩu luôn băm bằng `hashPassword()` trong `server/security.js`. API không bao giờ trả về `password_hash`.
- Mọi endpoint (trừ đăng ký, đăng nhập) cần token. Mọi truy cập dữ liệu thú cưng phải kiểm tra `pets.user_id` ở backend: không phải chủ thì **403**, không tồn tại thì **404**.
- Tệp tải lên phải kiểm tra đuôi, MIME, kích thước **và** chữ ký nội dung (`storage.sniff`).

**Kiểm tra dữ liệu**
- Quy tắc nằm ở **một chỗ**: `public/js/validators.js`, dùng chung cho cả trình duyệt và server. Sửa quy tắc thì sửa ở đây, không viết lại ở nơi khác.

**Giao diện**
- Giữ đúng thiết kế prototype. Hiệu ứng chuyển động dùng `transform` / `opacity`, không dùng `left` / `top` (gây giật).
- Không cuộn ngang ở 1366px, 820px, 390px.

**Code**
- Không thêm thư viện mới nếu không thật cần. Hiện chỉ dùng `pg`, `@vercel/blob` và `tailwindcss` (chỉ lúc build). Google Analytics và Sentry tải từ CDN, bật bằng biến `GA_MEASUREMENT_ID`, `SENTRY_DSN`.
- Không sửa tay `public/css/tailwind.css` (file sinh ra).
- Thông báo cho người dùng viết bằng tiếng Việt, rõ nguyên nhân và cách sửa.

## Skill — quy trình làm một việc

1. Đọc việc trong `PLAN.md` và phần tài liệu Step 2 liên quan.
2. **Viết hoặc cập nhật test trước** (Phase 0): unit test nếu là quy tắc / hàm thuần, integration test nếu là API, E2E nếu là giao diện.
3. Viết code cho đến khi test qua.
4. Chạy toàn bộ test:
   ```bash
   npm run test:unit                                    # unit, không cần database
   TEST_DATABASE_URL=postgres://... npm test            # unit + integration
   npm run dev & npm run test:ui                        # E2E (cần tài khoản demo: npm run db:seed)
   ```
5. Cập nhật `PLAN.md` (trạng thái) và `README.md` nếu có thay đổi đáng kể.
6. Commit với tên rõ ràng, theo quy ước `feat:` / `fix:` / `docs:` / `test:` (ví dụ `test: thêm test cân nặng âm`).

## Định nghĩa "xong"

- [ ] Test liên quan được viết trước và đã qua
- [ ] `npm test` qua hết, `npm run test:ui` qua hết
- [ ] Không có secret trong thay đổi
- [ ] Không vượt phạm vi Step 1–2 (hoặc đã ghi rõ thay đổi)
