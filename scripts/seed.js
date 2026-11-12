'use strict';
/*
 * Optional demo account: demo@pawpass.vn / 123456 with 3 pets, health records and vaccinations.
 * Usage: npm run db:seed  (skips if the demo account already exists).
 */
require('../server/env').load();
const db = require('../server/db');
const { hashPassword } = require('../server/security');

const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

(async () => {
  const email = 'demo@pawpass.vn';
  if (await db.one('SELECT id FROM users WHERE email = $1', [email])) { console.log('Demo account already exists.'); process.exit(0); }
  const u = await db.one('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    ['Nguyễn Minh Anh', email, await hashPassword('123456')]);
  const pets = [
    ['Mochi', 'Chó', 'Corgi', 'Đực', '2022-03-14', 11.2, 'Vàng trắng', 'Năng động, thích chạy nhảy và chơi bóng.', 'Dị ứng nhẹ với thịt gà.'],
    ['Mướp', 'Mèo', 'Mèo ta', 'Cái', '2021-08-02', 4.1, 'Vằn xám', 'Hiền, thích nằm phơi nắng.', 'Đã triệt sản.'],
    ['Bông', 'Chó', 'Poodle', 'Cái', '2024-11-20', 3.6, 'Trắng', 'Nhút nhát với người lạ.', null]
  ];
  const ids = [];
  for (const p of pets) {
    const row = await db.one(`INSERT INTO pets (user_id, name, species, breed, gender, date_of_birth, weight, color, description, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [u.id].concat(p));
    ids.push(row.id);
  }
  const health = [
    [ids[0], day(6), 'Ngứa, gãi tai nhiều', 'Viêm tai ngoài', 'Vệ sinh tai, nhỏ thuốc trong 7 ngày.', 'Thuốc nhỏ tai, 2 lần/ngày', 'Theo dõi thêm nếu còn ngứa.'],
    [ids[0], day(95), 'Khám sức khỏe định kỳ', 'Sức khỏe tốt', null, null, 'Cân nặng ổn định.'],
    [ids[1], day(20), 'Bỏ ăn 2 ngày', 'Rối loạn tiêu hóa nhẹ', 'Ăn thức ăn mềm, bù nước.', 'Men vi sinh, 1 gói/ngày', null],
    [ids[2], day(2), 'Kiểm tra tổng quát', 'Có ve trên da', 'Diệt ve, tắm thuốc.', 'Thuốc trị ve dạng nhai', null]
  ];
  for (const h of health) {
    await db.query(`INSERT INTO health_records (pet_id, examination_date, reason, diagnosis, treatment, medication, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, h);
  }
  const vacc = [
    [ids[0], 'Vắc xin 7 bệnh (DHPPi+L)', day(400), 'Nhắc lại hằng năm', null],
    [ids[0], 'Dại (Rabies)', day(40), 'Mũi nhắc lại', 'Không có phản ứng phụ.'],
    [ids[1], 'Vắc xin 4 bệnh cho mèo', day(150), 'Mũi nhắc lại', null],
    [ids[2], 'Vắc xin 5 bệnh (DHPP)', day(31), 'Mũi 1', 'Mệt nhẹ 1 ngày sau tiêm.'],
    [ids[2], 'Vắc xin 5 bệnh (DHPP)', day(3), 'Mũi 2', null]
  ];
  for (const v of vacc) {
    await db.query('INSERT INTO vaccinations (pet_id, vaccine_name, vaccination_date, dose, notes) VALUES ($1,$2,$3,$4,$5)', v);
  }
  console.log('Demo account created: ' + email + ' / 123456');
  process.exit(0);
})().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
