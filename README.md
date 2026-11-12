# PawPass — Sổ hộ chiếu thú cưng

Ứng dụng web quản lý hồ sơ, sức khỏe, tiêm phòng và giấy tờ cho nhiều thú cưng của một người dùng.
Giao diện giữ nguyên prototype Step 1. API, database và quy tắc đúng tài liệu Step 2 (bản đã đồng bộ cho Vercel).

## Cấu trúc dự án

```
pawpass/
├── api/index.js            # Vercel Function: mọi request /api/* vào đây
├── server/
│   ├── app.js              # 25 endpoint REST + xác thực + kiểm tra sở hữu + xử lý lỗi
│   ├── http.js             # router, đọc JSON / multipart, lỗi HTTP
│   ├── db.js               # kết nối PostgreSQL (pg), chuẩn hóa dữ liệu trả về
│   ├── security.js         # băm mật khẩu scrypt, JWT HS256
│   ├── storage.js          # Vercel Blob (production) hoặc ./uploads (local), kiểm tra chữ ký tệp
│   ├── env.js              # đọc .env khi chạy local
│   └── local.js            # server chạy local: frontend + API
├── public/                 # frontend tĩnh (Vercel phục vụ thư mục này)
│   ├── index.html          # template giao diện từ prototype
│   ├── css/app.css
│   ├── js/runtime.js       # bộ render template (sc-if, sc-for, {{...}})
│   ├── js/app.js           # trạng thái + luồng màn hình, gọi API thật
│   ├── js/validators.js    # quy tắc validation dùng chung client + server
│   └── assets/             # hình minh họa chó mèo
├── db/schema.sql           # 5 bảng theo ERD
├── scripts/migrate.js      # tạo bảng
├── scripts/seed.js         # (tùy chọn) tài khoản demo
├── scripts/psql-driver.js  # chỉ dùng khi test offline, không dùng production
├── tests/api.test.js       # 36 test API trên PostgreSQL thật
├── tests/ui/run-ui.js      # test giao diện end-to-end bằng Playwright
├── vercel.json
└── .env.example
```

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Có | Khóa ký token đăng nhập, tối thiểu 32 ký tự ngẫu nhiên |
| `BLOB_READ_WRITE_TOKEN` | Trên Vercel | Tự có khi gắn Vercel Blob store. Để trống khi chạy local thì file lưu vào `./uploads` |
| `PORT`, `UPLOAD_DIR`, `PG_POOL_MAX` | Không | Cổng local, thư mục upload local, số kết nối DB |

Tạo `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Deploy lên Vercel

1. Đẩy thư mục này lên một repo GitHub, rồi trên Vercel chọn **Add New → Project** và import repo đó. Framework Preset để **Other**, không cần Build Command.
2. Tạo database: trong project chọn **Storage → Create → Neon (Postgres)** rồi gắn vào project. Vercel tự thêm `DATABASE_URL`.
3. Tạo kho file: **Storage → Create → Blob** rồi gắn vào project. Vercel tự thêm `BLOB_READ_WRITE_TOKEN`.
4. Vào **Settings → Environment Variables**, thêm `JWT_SECRET`.
5. Tạo bảng (chạy một lần từ máy bạn, dùng đúng `DATABASE_URL` của Neon):
   ```bash
   npm install
   DATABASE_URL="postgres://..." npm run db:migrate
   DATABASE_URL="postgres://..." npm run db:seed   # tùy chọn: demo@pawpass.vn / 123456
   ```
   Có thể dán nội dung `db/schema.sql` vào SQL Editor của Neon thay cho lệnh migrate.
6. Bấm **Redeploy**. Mở link Vercel và đăng ký tài khoản.

## Chạy local

Cần Node.js 20+ và PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # sửa DATABASE_URL và JWT_SECRET
createdb pawpass                # hoặc tạo database bằng công cụ bạn dùng
npm run db:migrate
npm run db:seed                 # tùy chọn
npm run dev                     # http://localhost:3000 (frontend + backend cùng một lệnh)
```

Frontend là file tĩnh nên không có lệnh riêng: `npm run dev` phục vụ cả giao diện lẫn API.

## Kiểm thử

```bash
createdb pawpass_test
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/pawpass_test npm test   # 36 test API

npm i -D playwright && npx playwright install chromium
npm run dev &                                                              # cần tài khoản demo (npm run db:seed)
npm run test:ui                                                            # luồng giao diện + responsive
```

Test API bao gồm đăng ký, đăng nhập, đăng xuất, token giả và hết hạn, CRUD thú cưng, sức khỏe, tiêm phòng, tài liệu. Test cũng kiểm tra file sai định dạng, file giả đuôi, file rỗng, file lớn hơn 4 MB (413), tải xuống đúng từng byte, xóa dây chuyền, và người dùng B không truy cập được dữ liệu của người dùng A (403).

Test giao diện kiểm tra toàn bộ luồng chính, không có lỗi console và không bị cuộn ngang ở 3 khổ: desktop 1366px, tablet 820px, mobile 390px. Ảnh chụp lưu ở `tests/ui/output/`.

## Bảo mật

- Mật khẩu băm bằng scrypt, có salt riêng cho từng tài khoản. API không bao giờ trả về `password_hash`.
- Mọi endpoint, trừ đăng ký và đăng nhập, đều cần JWT hợp lệ. Mọi tài nguyên đều kiểm tra `pets.user_id` ở backend: không phải chủ thì trả 403.
- Validation chạy ở cả client và server. File tải lên được kiểm tra đuôi, MIME, kích thước và chữ ký nội dung.
- Tài liệu chỉ tải được qua `/api/documents/:id/download`, có kiểm tra quyền sở hữu.
- Mọi secret lấy từ biến môi trường, không có secret nào trong mã nguồn.

## Giới hạn đã biết

- Đăng xuất chỉ xóa token ở trình duyệt. JWT đã cấp vẫn hợp lệ đến khi hết hạn (7 ngày) vì ERD không có bảng phiên.
- Tài liệu tối đa 4 MB do Vercel giới hạn request ở 4,5 MB.
- Ảnh thú cưng và ảnh đại diện nằm ở URL Blob công khai nhưng khó đoán. Tài liệu thì luôn đi qua API có kiểm tra quyền.
- Tìm kiếm lọc phía client trên dữ liệu đã tải, phù hợp quy mô dữ liệu của một người dùng.
