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
├── server/schema.js        # cùng SQL, API tự áp dụng khi chạy lần đầu
├── scripts/migrate.js      # tạo bảng thủ công (tùy chọn)
├── scripts/seed.js         # (tùy chọn) tài khoản demo
├── scripts/psql-driver.js  # chỉ dùng khi test offline, không dùng production
├── tests/api.test.js       # 38 test API trên PostgreSQL thật
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

1. Import repo GitHub vào Vercel (**Add New → Project**). Framework Preset để **Other**, không cần Build Command.
2. **Storage → Create Database → Neon (Postgres)** → **Connect Project**: chọn `pawpass-hosothucung`, **All Environments**, ô **Custom Prefix** gõ `DATABASE` (để có biến `DATABASE_URL`), không tích "Create database branch".
3. **Storage → Create → Blob**: chọn quyền truy cập **Public** (bắt buộc: ảnh thú cưng hiển thị trực tiếp; kho Private sẽ báo lỗi `access must be "public"`).
   Khi **Connect Project**: prefix để trống và **tích "Add a read-write token env var to this connection"** để có biến `BLOB_READ_WRITE_TOKEN`.
4. Thêm `JWT_SECRET` (chuỗi ngẫu nhiên tối thiểu 32 ký tự, All Environments). Có thể thêm ở **Settings → Environment Variables** của project, hoặc ở trang Environment Variables của team → tab **Shared** (nhớ chọn project ở ô **Link to Projects**).
5. Deploy lại: biến môi trường chỉ có hiệu lực ở lần deploy *sau* khi thêm. Nếu nút **Redeploy** treo, sửa một chữ trong `README.md` trên GitHub rồi commit — Vercel tự deploy.

Không cần tự tạo bảng: API tạo bảng (`CREATE TABLE IF NOT EXISTS`) ở request đầu tiên.
Muốn tạo tài khoản demo thì chạy `DATABASE_URL="postgres://..." npm run db:seed` từ máy bạn.

### Khi gặp lỗi

| Thông báo trên web | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| Máy chủ chưa được cấu hình cơ sở dữ liệu | Không có `DATABASE_URL` | Làm lại bước 2, rồi Redeploy |
| Máy chủ chưa được cấu hình JWT_SECRET | Thiếu hoặc ngắn hơn 32 ký tự | Làm lại bước 4, rồi Redeploy |
| Không lưu được ảnh/tài liệu lên Vercel Blob: … | Thiếu token hoặc kho Blob để Private | Làm lại bước 3 (kho **Public**, tích ô token), rồi deploy lại |
| Không kết nối được cơ sở dữ liệu | Sai chuỗi kết nối, DB bị xóa/tạm dừng | Kiểm tra Neon dashboard; xem log ở **Deployments → Functions/Logs** (dòng `[api] … `) |

## Chạy local

Cần Node.js 20+ và PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # sửa DATABASE_URL và JWT_SECRET
createdb pawpass                # hoặc tạo database bằng công cụ bạn dùng
npm run db:migrate              # tùy chọn: API cũng tự tạo bảng
npm run db:seed                 # tùy chọn
npm run dev                     # http://localhost:3000 (frontend + backend cùng một lệnh)
```

Frontend là file tĩnh nên không có lệnh riêng: `npm run dev` phục vụ cả giao diện lẫn API.

## Kiểm thử

```bash
createdb pawpass_test
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/pawpass_test npm test   # 38 test API

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

## Lịch sử chỉnh sửa sau bản đầu tiên

| Vấn đề | Đã sửa ở file |
| --- | --- |
| Web báo "Không kết nối được cơ sở dữ liệu" khi biến DB có tên khác | `server/db.js` nhận `DATABASE_URL`, `POSTGRES_URL` và biến có tiền tố riêng; tự tạo bảng ở lần chạy đầu (`server/schema.js`) |
| Lỗi cấu hình hiện chung chung "Lỗi máy chủ" | `server/app.js`, `server/security.js`: báo rõ thiếu `DATABASE_URL` / `JWT_SECRET` |
| Không lưu được ảnh, tài liệu trên Vercel | `server/storage.js`: báo rõ thiếu Blob hoặc lỗi Blob; thử chế độ private; `package.json` dùng `@vercel/blob` bản mới |
| Màn hình giật liên tục (chó mèo đi dạo) | `public/css/app.css`: chuyển hiệu ứng đi bộ sang `transform` |
| Thẻ, nút nhảy lên khi rê chuột / chạm | `public/css/app.css`: bỏ hiệu ứng nhảy khi hover |
| Thanh cuộn hiện/ẩn làm trang co giãn; iPhone tự phóng to khi chạm ô nhập | `public/css/app.css`: giữ chỗ thanh cuộn, chữ ô nhập 16px trên điện thoại |
| Lighthouse: thiếu điểm mốc `<main>`, ảnh nặng, phông chữ và script chặn hiển thị | `public/index.html` (thẻ `<main>`, tải phông chữ song song, script `defer`), `public/assets/` (ảnh WebP, 1.040 KB → 196 KB) |

Kiểm thử bản cuối: 39 test API và toàn bộ test giao diện đều qua.

