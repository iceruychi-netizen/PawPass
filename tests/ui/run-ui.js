'use strict';
/*
 * End-to-end UI test with Playwright against a running app (npm run dev).
 *   BASE_URL=http://localhost:3000 npm run test:ui
 * Walks every main flow, checks console errors and horizontal overflow on
 * desktop / tablet / mobile, and saves screenshots to tests/ui/output/.
 */
const path = require('path');
const fs = require('fs');
let playwright;
try { playwright = require('playwright'); } catch (e) { console.error('Install Playwright first: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');

let failures = 0;
function check(cond, label) {
  if (cond) console.log('  ✓ ' + label);
  else { failures++; console.log('  ✗ ' + label); }
}

async function run() {
  const browser = await playwright.chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_TUNNEL|net::ERR_|status of 4\d\d/.test(m.text() + (m.location().url || ''))) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const btn = (name, exact) => page.getByRole('button', { name, exact: !!exact });
  const toast = async (re) => { try { await page.locator('.toast', { hasText: re }).first().waitFor({ timeout: 6000 }); return true; } catch (e) { return false; } };
  const seenOn = async (pg, t) => { try { await pg.getByText(t).first().waitFor({ timeout: 6000 }); return true; } catch (e) { return false; } };
  const seen = (t) => seenOn(page, t);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const email = 'ui' + Date.now() + '@example.com';

  console.log('Authentication');
  await page.goto(BASE + '/');
  await btn('Đăng nhập', true).click();
  check(await page.locator('.err').count() > 0, 'empty login shows field errors');
  await page.fill('#lg-email', 'nobody@example.com'); await page.fill('#lg-pass', 'wrongpass');
  await btn('Đăng nhập', true).click();
  check(await seen('Email hoặc mật khẩu không đúng.'), 'invalid credentials show an error');
  await page.getByRole('button', { name: 'Đăng ký ngay' }).click();
  await page.fill('#rg-name', 'Lan Phạm'); await page.fill('#rg-email', email);
  await page.fill('#rg-pass', 'matkhau1'); await page.fill('#rg-confirm', 'matkhau2');
  await btn('Tạo tài khoản').click();
  check(await seen('Mật khẩu nhập lại không khớp.'), 'register validates password confirmation');
  await page.fill('#rg-confirm', 'matkhau1');
  await btn('Tạo tài khoản').click();
  await page.getByRole('button', { name: 'Bỏ qua' }).click({ timeout: 8000 });
  check(/#\/dashboard$/.test(page.url()), 'register signs in and lands on the dashboard');
  await shot('01-dashboard-empty');

  console.log('Pets');
  await btn(/Thêm một bé mới|Thêm thú cưng/).first().click();
  await btn('Lưu', true).click();
  check(await seen('Vui lòng nhập tên thú cưng.'), 'pet form validates required fields');
  await page.fill('#pt-name', 'Mochi');
  await page.selectOption('#pt-species', 'Chó');
  await page.fill('#pt-breed', 'Corgi');
  await page.selectOption('#pt-gender', 'Đực');
  await page.fill('#pt-dob', '2022-03-14');
  await page.fill('#pt-weight', '300');
  await btn('Lưu', true).click();
  check(await seen('Cân nặng tối đa 200 kg.'), 'weight is validated');
  await page.fill('#pt-weight', '11,2');
  await page.setInputFiles('#pt-photo', { name: 'mochi.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForTimeout(300);
  await btn('Lưu', true).click();
  check(await toast(/Chào mừng Mochi/), 'pet created');
  check(/#\/pets\/\d+\/health$/.test(page.url()), 'opens the new pet profile (health tab URL)');
  const petUrl = page.url();
  await shot('02-pet-profile');

  await btn('Sửa hồ sơ').click();
  await page.fill('#pt-color', 'Vàng trắng');
  await page.fill('#pt-notes', 'Dị ứng thịt gà');
  await btn('Lưu', true).click();
  check(await toast(/Đã cập nhật hồ sơ/), 'pet edited');

  console.log('Health records');
  await btn('Thêm lần khám').click();
  await page.fill('#hr-reason', '');
  await btn('Lưu', true).click();
  check(await seen('Vui lòng nhập lý do khám.'), 'health form validates reason');
  await page.fill('#hr-reason', 'Ngứa tai'); await page.fill('#hr-diag', 'Viêm tai ngoài'); await page.fill('#hr-med', 'Thuốc nhỏ tai');
  await btn('Lưu', true).click();
  check(await toast(/Đã thêm lần khám/), 'health record added');
  await btn('Xem chi tiết').first().click();
  check(await page.locator('#pp-vh').waitFor({ timeout: 5000 }).then(() => true, () => false), 'health record detail opens');
  await btn('Chỉnh sửa').click();
  await page.fill('#hr-treat', 'Vệ sinh tai 7 ngày');
  await btn('Lưu', true).click();
  check(await toast(/Đã cập nhật lần khám/), 'health record edited');

  console.log('Vaccinations');
  await page.getByRole('tab', { name: /Tiêm chủng/ }).click();
  check(/\/vaccinations$/.test(page.url()), 'vaccination tab has its own URL');
  await btn('Thêm mũi tiêm').click();
  await page.fill('#vc-name', 'Dại (Rabies)'); await page.fill('#vc-dose', 'Mũi 1');
  await btn('Lưu', true).click();
  check(await toast(/Đã đóng dấu mũi tiêm mới/), 'vaccination added');
  await page.getByRole('button', { name: 'Sửa mũi tiêm' }).first().click();
  await page.fill('#vc-dose', 'Mũi nhắc lại');
  await btn('Lưu', true).click();
  check(await toast(/Đã cập nhật mũi tiêm/), 'vaccination edited');
  await shot('03-vaccinations');

  console.log('Documents');
  await page.getByRole('tab', { name: /Tài liệu/ }).click();
  check(/\/documents$/.test(page.url()), 'documents tab has its own URL');
  await btn('Tải lên').first().click();
  await page.setInputFiles('#dc-file', { name: 'ghi-chu.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  check(await seen('Định dạng không được hỗ trợ'), 'invalid file type rejected');
  await page.setInputFiles('#dc-file', { name: 'lon.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([PDF, Buffer.alloc(4 * 1024 * 1024 + 1)]) });
  check(await seen('Tệp vượt quá giới hạn 4 MB.'), 'oversized file rejected');
  await page.setInputFiles('#dc-file', { name: 'so-tiem-chung.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.fill('#dc-desc', 'Bản scan sổ tiêm');
  await page.locator('.modal').getByRole('button', { name: 'Tải lên', exact: true }).click();
  check(await toast(/Đã cất so-tiem-chung.pdf/), 'PDF uploaded');
  await btn('Tải lên').first().click();
  await page.setInputFiles('#dc-file', { name: 'don-thuoc.png', mimeType: 'image/png', buffer: PNG });
  await page.locator('.modal').getByRole('button', { name: 'Tải lên', exact: true }).click();
  check(await toast(/Đã cất don-thuoc.png/), 'image uploaded');
  await page.waitForTimeout(800);
  check(await page.locator('img[src^="blob:"]').count() > 0, 'image preview loaded through the authorised download');
  await page.getByRole('button', { name: 'Xem' }).first().click();
  check(await page.locator('#pp-vd').waitFor({ timeout: 5000 }).then(() => true, () => false), 'document view opens');
  const dl = page.waitForEvent('download', { timeout: 8000 });
  await page.locator('.modal').getByRole('link', { name: 'Tải xuống' }).click();
  const file = await dl;
  check(!!(await file.suggestedFilename()), 'document downloads (' + (await file.suggestedFilename()) + ')');
  await btn('Đóng', true).first().click();
  await shot('04-documents');
  await page.getByRole('button', { name: 'Xóa tài liệu' }).first().click();
  await page.locator('.modal').getByRole('button', { name: 'Xóa', exact: true }).click();
  check(await toast(/Đã xóa/), 'document deleted after confirmation');

  console.log('Search, dashboard, account');
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().click();
  await page.locator('input[type="search"], .search input, input').first().fill('rabies');
  check(await seen('Dại (Rabies)'), 'global search finds a vaccination');
  await page.getByRole('button', { name: 'Trang chủ' }).first().click();
  check(await seen('Mochi'), 'dashboard lists the pet from the database');
  await page.getByRole('button', { name: 'Tài khoản' }).first().click();
  await btn('Sửa thông tin').click();
  await page.fill('#ac-name', 'Lan Phạm Thị');
  await btn('Lưu', true).click();
  check(await toast(/Đã cập nhật tài khoản/), 'account updated');
  await btn('Đổi mật khẩu').click();
  await page.fill('#pw-cur', 'sai-mat-khau'); await page.fill('#pw-new', 'matkhau9'); await page.fill('#pw-confirm', 'matkhau9');
  await btn('Lưu', true).click();
  check(await seen('Mật khẩu hiện tại không đúng.'), 'wrong current password rejected');
  await page.fill('#pw-cur', 'matkhau1');
  await btn('Lưu', true).click();
  check(await toast(/Đã đổi mật khẩu/), 'password changed');

  console.log('Session & authorization');
  await page.reload();
  await page.waitForTimeout(1200);
  check(await seen('Lan Phạm Thị'), 'session survives a reload');
  const ctxB = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const pb = await ctxB.newPage();
  await pb.goto(BASE + '/');
  await pb.getByRole('button', { name: 'Đăng ký ngay' }).click();
  await pb.fill('#rg-name', 'Người B'); await pb.fill('#rg-email', 'b' + email);
  await pb.fill('#rg-pass', 'matkhau1'); await pb.fill('#rg-confirm', 'matkhau1');
  await pb.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await pb.getByRole('button', { name: 'Bỏ qua' }).click({ timeout: 8000 });
  await pb.goto(petUrl);
  await pb.waitForTimeout(1500);
  check(await seenOn(pb, 'Bạn không có quyền truy cập thú cưng này.'), 'user B opening user A\'s pet URL is refused');
  check(/#\/pets$/.test(pb.url()), 'user B is sent back to their own pet list');
  await ctxB.close();

  console.log('Delete pet');
  await page.goto(petUrl);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Xóa Mochi' }).first().click();
  check(await seen('toàn bộ lần khám, mũi tiêm và tài liệu sẽ bị xóa'), 'delete warns about related records');
  await page.locator('.modal').getByRole('button', { name: 'Xóa', exact: true }).click();
  check(await toast(/Đã xóa thú cưng/), 'pet deleted');

  await page.getByRole('button', { name: 'Đăng xuất' }).first().click();
  check(await page.locator('#lg-email').waitFor({ timeout: 5000 }).then(() => true, () => false), 'logout returns to login');

  console.log('Responsive');
  // demo data for layout checks
  await page.fill('#lg-email', 'demo@pawpass.vn'); await page.fill('#lg-pass', '123456');
  await btn('Đăng nhập', true).click();
  await page.getByRole('button', { name: 'Bỏ qua' }).click({ timeout: 8000 });
  await page.waitForTimeout(800);
  const views = [['desktop', 1366, 860], ['tablet', 820, 1180], ['mobile', 390, 844]];
  for (const [name, w, h] of views) {
    await page.setViewportSize({ width: w, height: h });
    for (const route of ['#/dashboard', '#/pets', '#/pets/1/health', '#/pets/1/documents', '#/search', '#/account']) {
      await page.evaluate((r) => { history.pushState(null, '', r); dispatchEvent(new PopStateEvent('popstate')); }, route);
      await page.waitForTimeout(350);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(over <= 1, name + ' ' + route + ' has no horizontal scroll (' + over + 'px)');
    }
    await page.evaluate(() => { history.pushState(null, '', '#/dashboard'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.waitForTimeout(300);
    await shot('05-' + name + '-dashboard');
    await btn(/Thêm một bé mới|Thêm thú cưng/).first().click();
    await page.waitForTimeout(250);
    const modalFits = await page.evaluate(() => { const m = document.querySelector('.modal'); if (!m) return false; const r = m.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; });
    check(modalFits, name + ' form modal fits the screen');
    await shot('06-' + name + '-form');
    await btn('Hủy', true).first().click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Đăng xuất' }).first().click();
  await page.waitForTimeout(400);
  await shot('07-mobile-login');

  check(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll UI checks passed');
  process.exit(failures ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
