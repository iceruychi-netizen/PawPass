# Kế hoạch triển khai — PawPass (Step 3: Implement)

Tài liệu này là bước **Planning → Review Plan** trước khi viết code, theo quy trình của môn:

```
Step 1 ① Prototype/Design ─┐
Step 2 ② PRD  ③ Solution Architecture  ④ ERD  ⑤ API Docs ─┤
                                                          ▼
Step 3   Planning → Review Plan → Code (AI Coding Agent + Rule/Skill/Context) → Tests → Frontend + Backend
```

- **Frontend** được làm từ ① + ② + ③ + ⑤
- **Backend** được làm từ ② + ③ + ④ + ⑤
- Rule + Context cho AI Coding Agent: xem [`CLAUDE.md`](CLAUDE.md)
- Phân công: xem [`PHAN-CONG.md`](PHAN-CONG.md)

Trạng thái: ✅ xong · 🟨 đang làm · ⬜ chưa làm

Cột **Phụ trách** là người phụ trách phần đó và đưa phần đó lên repo ngày 13/11. Mã nguồn được viết với AI Coding Agent; các bản sửa sau deploy và các mục 2.5, 2.6, 3.6, 3.7 do Hữu Triết thực hiện cùng AI.

---

## Phase 0 — Test trước (định nghĩa "thế nào là đúng")

Viết test **trước** khi viết code, dựa trên tiêu chí nghiệm thu (AC) trong PRD ② và API Docs ⑤. Code chỉ được coi là xong khi các test này qua.

| # | Việc | Đầu vào | Kết quả | Phụ trách | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 0.1 | **Unit test** quy tắc kiểm tra dữ liệu: email, mật khẩu, loài, giới tính, cân nặng, ngày không ở tương lai, tệp JPG/PNG/PDF ≤ 4 MB | ② AC, ⑤ | `tests/unit/validators.test.js` | Duy Quang | ✅ |
| 0.2 | **Unit test** bảo mật (và `tests/unit/monitor.test.js` cho Sentry): băm mật khẩu có salt, token bị sửa / sai khóa / hết hạn bị từ chối, kiểm tra chữ ký tệp | ③ | `tests/unit/security.test.js` | Thành Đạt | ✅ |
| 0.3 | **Integration test** toàn bộ API trên PostgreSQL thật: đăng ký, đăng nhập, CRUD thú cưng, sức khỏe, tiêm phòng, tài liệu, người B không xem được dữ liệu người A (403) | ④, ⑤ | `tests/api.test.js` | Duy Quang | ✅ |
| 0.4 | **E2E test** giao diện bằng trình duyệt thật: luồng chính, không lỗi console, không cuộn ngang ở 1366 / 820 / 390px | ①, ② | `tests/ui/run-ui.js` | Duy Huy | ✅ |

Chạy: `npm run test:unit` · `npm test` (unit + integration) · `npm run test:ui` (E2E)

---

## Phase 1 — Database

| # | Việc | Đầu vào | Kết quả | Phụ trách | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1.1 | 5 bảng theo ERD: `users`, `pets`, `health_records`, `vaccinations`, `documents`; khóa ngoại xóa dây chuyền; ràng buộc loài, giới tính, cân nặng, loại tệp | ④ | `db/schema.sql`, `server/schema.js` | Duy Quang | ✅ |
| 1.2 | Kết nối PostgreSQL (Neon), tự tạo bảng ở lần chạy đầu | ③ | `server/db.js` | Duy Quang | ✅ |
| 1.3 | Script tạo bảng và tài khoản demo | ④ | `scripts/migrate.js`, `scripts/seed.js` | Duy Quang | ✅ |

**Kiểm tra:** test 0.3 tạo được dữ liệu, xóa thú cưng thì xóa luôn hồ sơ và tài liệu.

---

## Phase 2 — Backend API

| # | Việc | Đầu vào | Kết quả | Phụ trách | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Router, đọc JSON / multipart, mã lỗi HTTP | ③, ⑤ | `server/http.js` | Thành Đạt | ✅ |
| 2.2 | Băm mật khẩu (scrypt), token đăng nhập (JWT, 7 ngày), secret từ biến môi trường | ③ | `server/security.js` | Thành Đạt | ✅ |
| 2.3 | 5 endpoint xác thực + 20 endpoint thú cưng / sức khỏe / tiêm phòng / tài liệu; kiểm tra quyền sở hữu ở mọi endpoint | ②, ④, ⑤ | `server/app.js` | Hữu Triết | ✅ |
| 2.4 | Lưu tệp: Vercel Blob (khi deploy) hoặc thư mục `uploads/` (khi chạy máy) | ③ | `server/storage.js` | Thành Đạt | ✅ |
| 2.5 | `GET /api/overview`: cả trang chính trong 1 lần gọi (**bổ sung** sau khi đo thấy trang chính chậm) | ⑤ | `server/app.js` | Hữu Triết | ✅ |
| 2.6 | `GET /api/config` + gửi lỗi 5xx lên Sentry (`server/monitor.js`) — **bổ sung theo đề bài môn học** | ⑤ | `server/app.js`, `server/monitor.js` | Hữu Triết | ✅ |

**Kiểm tra:** test 0.2 và 0.3 qua hết.

---

## Phase 3 — Frontend

| # | Việc | Đầu vào | Kết quả | Phụ trách | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Chuyển các màn hình của prototype thành template | ① | `public/index.html`, `public/assets/` | Hữu Triết | ✅ |
| 3.2 | CSS, responsive 3 khổ màn hình, hiệu ứng mượt (`transform`) | ① | `public/css/app.css` | Duy Huy | ✅ |
| 3.3 | Bộ hiển thị template (`sc-if`, `sc-for`, `{{...}}`) | ③ | `public/js/runtime.js` | Thế Dũng | ✅ |
| 3.4 | Trạng thái, điều hướng, gọi API thật, thu nhỏ ảnh trước khi gửi, nhớ dữ liệu khi F5 | ②, ⑤ | `public/js/app.js` | Thế Dũng | ✅ |
| 3.5 | Dùng chung quy tắc kiểm tra dữ liệu với backend | ② | `public/js/validators.js` | Duy Quang | ✅ |
| 3.6 | Trang Giới thiệu và Liên hệ bằng **Tailwind CSS** — **bổ sung theo đề bài môn học** (tối thiểu 3 trang, có About/Contact) | ① | `public/gioi-thieu.html`, `public/lien-he.html`, `tailwind.config.js` | Hữu Triết | ✅ |
| 3.7 | Menu điện thoại, accordion, kiểm tra form liên hệ; Google Analytics + Sentry phía trình duyệt | ② | `public/js/site.js`, `public/js/monitoring.js` | Hữu Triết | ✅ |

**Kiểm tra:** test 0.4 qua hết.

---

## Phase 4 — Deploy & tối ưu

| # | Việc | Kết quả | Phụ trách | Trạng thái |
| --- | --- | --- | --- | --- |
| 4.1 | Deploy Vercel + Neon + Vercel Blob, secret chỉ nằm trong Environment Variables | https://pawpass-hosothucung-web.vercel.app/ | Duy Huy | ✅ |
| 4.2 | Lighthouse: ảnh WebP, phông chữ và CSS không chặn hiển thị | `public/` | Duy Huy | ✅ |
| 4.3 | Cùng vùng máy chủ Vercel với Neon (Settings → Functions → Function Region) | cấu hình Vercel | Hữu Triết | ⬜ |
| 4.4 | Tạo tài khoản Google Analytics và Sentry, đặt `GA_MEASUREMENT_ID`, `SENTRY_DSN` trên Vercel, chụp ảnh dashboard | cấu hình Vercel | Hữu Triết | ⬜ |

---

## Review Plan — kiểm tra lại trước khi code

- [x] Mỗi việc có đầu vào từ Step 1–2 và có test chứng minh đã xong
- [x] Không vượt phạm vi: **không** bác sĩ thú y, đặt lịch, thanh toán, chợ mua bán
- [x] Mật khẩu không lưu dạng chữ thường; không có secret trong mã nguồn
- [x] Backend tự kiểm tra quyền sở hữu, không tin frontend
- [x] Thay đổi so với tài liệu Step 2 được ghi lại: `GET /api/overview` (mục 2.5)
