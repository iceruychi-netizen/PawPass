'use strict';
/*
 * API integration tests against a real PostgreSQL database.
 * Uses TEST_DATABASE_URL (default: local pawpass_test). Run: npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('../server/env').load();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://pawpass:pawpass@localhost:5432/pawpass_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-123456';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pawpass-uploads-'));
delete process.env.BLOB_READ_WRITE_TOKEN;

const db = require('../server/db');
const handle = require('../server/app');

let base, server;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF');
const pngDataUrl = 'data:image/png;base64,' + PNG.toString('base64');

async function call(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + url, { method, headers, body: payload });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
}
function fileForm(buf, name, type, description) {
  const f = new FormData();
  f.append('file', new Blob([buf], { type }), name);
  if (description !== undefined) f.append('description', description);
  return f;
}
const today = () => new Date().toISOString().slice(0, 10);

test.before(async () => {
  await db.query('TRUNCATE users, pets, health_records, vaccinations, documents RESTART IDENTITY CASCADE');
  server = http.createServer(handle);
  await new Promise((r) => server.listen(0, r));
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
test.after(() => { server.close(); });

const A = { name: 'Nguyễn An', email: 'an@example.com', password: 'secret123' };
const B = { name: 'Trần Bình', email: 'binh@example.com', password: 'secret456' };
const S = {}; // shared state between ordered tests

test('Authentication', async (t) => {
  await t.test('register validates input (422)', async () => {
    const r = await call('POST', '/auth/register', { body: { name: '', email: 'bad', password: '123' } });
    assert.equal(r.status, 422);
    assert.ok(r.data.errors.name && r.data.errors.email && r.data.errors.password);
  });
  await t.test('register creates the account (201) and never returns the hash', async () => {
    const r = await call('POST', '/auth/register', { body: A });
    assert.equal(r.status, 201);
    assert.equal(r.data.user.email, A.email);
    assert.equal(r.data.user.password_hash, undefined);
    assert.ok(r.data.token);
    S.tokenA = r.data.token;
    const row = await db.one('SELECT password_hash FROM users WHERE email = $1', [A.email]);
    assert.notEqual(row.password_hash, A.password);
    assert.match(row.password_hash, /^scrypt\$/);
  });
  await t.test('duplicate email → 409', async () => {
    const r = await call('POST', '/auth/register', { body: Object.assign({}, A, { email: 'AN@example.com' }) });
    assert.equal(r.status, 409);
    assert.ok(r.data.errors.email);
  });
  await t.test('login with wrong password → 401, same message as unknown email', async () => {
    const a = await call('POST', '/auth/login', { body: { email: A.email, password: 'wrongpass' } });
    const b = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'wrongpass' } });
    assert.equal(a.status, 401); assert.equal(b.status, 401);
    assert.equal(a.data.error, b.data.error);
  });
  await t.test('login works', async () => {
    const r = await call('POST', '/auth/login', { body: { email: A.email, password: A.password } });
    assert.equal(r.status, 200);
    S.tokenA = r.data.token;
    const rb = await call('POST', '/auth/register', { body: B });
    S.tokenB = rb.data.token;
  });
  await t.test('protected routes need a valid token', async () => {
    assert.equal((await call('GET', '/auth/me')).status, 401);
    assert.equal((await call('GET', '/pets')).status, 401);
    assert.equal((await call('GET', '/auth/me', { token: S.tokenA + 'x' })).status, 401);
    const parts = S.tokenA.split('.');
    const forged = parts[0] + '.' + Buffer.from(JSON.stringify({ sub: '2', exp: 9999999999 })).toString('base64url') + '.' + parts[2];
    assert.equal((await call('GET', '/auth/me', { token: forged })).status, 401);
    const me = await call('GET', '/auth/me', { token: S.tokenA });
    assert.equal(me.status, 200); assert.equal(me.data.email, A.email);
  });
  await t.test('logout → 204', async () => {
    assert.equal((await call('POST', '/auth/logout', { token: S.tokenA })).status, 204);
  });
});

test('Pets CRUD', async (t) => {
  const pet = { name: 'Mochi', species: 'Chó', breed: 'Corgi', gender: 'Đực', date_of_birth: '2022-03-14', weight: '11,2', color: 'Vàng', description: 'Hiếu động', notes: 'Dị ứng gà', photo: '' };
  await t.test('validation (422)', async () => {
    const r = await call('POST', '/pets', { token: S.tokenA, body: { name: '', species: 'Rồng', gender: 'x', date_of_birth: '2999-01-01', weight: '-1' } });
    assert.equal(r.status, 422);
    for (const k of ['name', 'species', 'gender', 'date_of_birth', 'weight']) assert.ok(r.data.errors[k], k);
    const big = await call('POST', '/pets', { token: S.tokenA, body: Object.assign({}, pet, { weight: '250' }) });
    assert.equal(big.status, 422);
  });
  await t.test('create with photo (201)', async () => {
    const r = await call('POST', '/pets', { token: S.tokenA, body: Object.assign({}, pet, { photo: pngDataUrl }) });
    assert.equal(r.status, 201);
    assert.equal(r.data.weight, 11.2);
    assert.equal(r.data.date_of_birth, '2022-03-14');
    assert.match(r.data.photo, /^\/uploads\/photos\/pets\/\d+\/.+\.png$/);
    S.petA = r.data;
  });
  await t.test('photo must really be an image', async () => {
    const r = await call('POST', '/pets', { token: S.tokenA, body: Object.assign({}, pet, { photo: 'data:image/png;base64,' + PDF.toString('base64') }) });
    assert.equal(r.status, 422); assert.ok(r.data.errors.photo);
    const count = await db.one('SELECT count(*)::int AS n FROM pets');
    assert.equal(count.n, 1, 'no half-created pet left behind');
  });
  await t.test('multiple pets + list returns only mine', async () => {
    const r2 = await call('POST', '/pets', { token: S.tokenA, body: { name: 'Mướp', species: 'Mèo', gender: 'Cái' } });
    assert.equal(r2.status, 201); S.petA2 = r2.data;
    const rb = await call('POST', '/pets', { token: S.tokenB, body: { name: 'Lucky', species: 'Chó', gender: 'Đực' } });
    S.petB = rb.data;
    const list = await call('GET', '/pets', { token: S.tokenA });
    assert.deepEqual(list.data.map((p) => p.name), ['Mochi', 'Mướp']);
  });
  await t.test('view and edit', async () => {
    const g = await call('GET', '/pets/' + S.petA.id, { token: S.tokenA });
    assert.equal(g.status, 200); assert.equal(g.data.name, 'Mochi');
    const u = await call('PUT', '/pets/' + S.petA.id, { token: S.tokenA, body: Object.assign({}, pet, { name: 'Mochi Béo', weight: '12', photo: S.petA.photo }) });
    assert.equal(u.status, 200); assert.equal(u.data.name, 'Mochi Béo'); assert.equal(u.data.weight, 12);
    assert.equal(u.data.photo, S.petA.photo, 'unchanged photo kept');
    const np = await call('PUT', '/pets/' + S.petA.id, { token: S.tokenA, body: Object.assign({}, pet, { photo: '' }) });
    assert.equal(np.data.photo, null);
  });
  await t.test('404 for a missing pet', async () => {
    assert.equal((await call('GET', '/pets/99999', { token: S.tokenA })).status, 404);
  });
});

test('Health records CRUD', async (t) => {
  const url = () => '/pets/' + S.petA.id + '/health-records';
  await t.test('validation (422)', async () => {
    const r = await call('POST', url(), { token: S.tokenA, body: { examination_date: '', reason: '' } });
    assert.equal(r.status, 422); assert.ok(r.data.errors.examination_date && r.data.errors.reason);
  });
  await t.test('add, list (newest first), view, edit, delete', async () => {
    const a = await call('POST', url(), { token: S.tokenA, body: { examination_date: '2025-01-10', reason: 'Khám định kỳ', diagnosis: 'Tốt' } });
    const b = await call('POST', url(), { token: S.tokenA, body: { examination_date: today(), reason: 'Ngứa tai', medication: 'Thuốc nhỏ tai' } });
    assert.equal(a.status, 201); assert.equal(b.status, 201);
    const list = await call('GET', url(), { token: S.tokenA });
    assert.deepEqual(list.data.map((h) => h.reason), ['Ngứa tai', 'Khám định kỳ']);
    const v = await call('GET', '/health-records/' + a.data.id, { token: S.tokenA });
    assert.equal(v.data.diagnosis, 'Tốt');
    const e = await call('PUT', '/health-records/' + a.data.id, { token: S.tokenA, body: { examination_date: '2025-01-11', reason: 'Khám lại', diagnosis: '' } });
    assert.equal(e.status, 200); assert.equal(e.data.reason, 'Khám lại'); assert.equal(e.data.diagnosis, null);
    assert.equal((await call('DELETE', '/health-records/' + a.data.id, { token: S.tokenA })).status, 204);
    assert.equal((await call('GET', '/health-records/' + a.data.id, { token: S.tokenA })).status, 404);
    S.healthA = b.data;
  });
});

test('Vaccinations CRUD', async (t) => {
  const url = () => '/pets/' + S.petA.id + '/vaccinations';
  await t.test('validation (422)', async () => {
    const r = await call('POST', url(), { token: S.tokenA, body: { vaccine_name: '', vaccination_date: 'abc', dose: '' } });
    assert.equal(r.status, 422);
    for (const k of ['vaccine_name', 'vaccination_date', 'dose']) assert.ok(r.data.errors[k], k);
  });
  await t.test('add, view, edit, delete', async () => {
    const a = await call('POST', url(), { token: S.tokenA, body: { vaccine_name: 'Dại', vaccination_date: '2025-05-01', dose: 'Mũi 1' } });
    assert.equal(a.status, 201);
    const e = await call('PUT', '/vaccinations/' + a.data.id, { token: S.tokenA, body: { vaccine_name: 'Dại (Rabies)', vaccination_date: '2025-05-01', dose: 'Mũi nhắc lại', notes: 'Ổn' } });
    assert.equal(e.data.dose, 'Mũi nhắc lại');
    assert.equal((await call('GET', '/vaccinations/' + a.data.id, { token: S.tokenA })).data.notes, 'Ổn');
    const b = await call('POST', url(), { token: S.tokenA, body: { vaccine_name: '7 bệnh', vaccination_date: '2025-06-01', dose: 'Mũi 1' } });
    assert.equal((await call('DELETE', '/vaccinations/' + a.data.id, { token: S.tokenA })).status, 204);
    S.vaccA = b.data;
  });
});

test('Documents', async (t) => {
  const url = () => '/pets/' + S.petA.id + '/documents';
  await t.test('upload PDF and PNG', async () => {
    const p = await call('POST', url(), { token: S.tokenA, form: fileForm(PDF, 'Sổ tiêm chủng.pdf', 'application/pdf', 'Bản scan') });
    assert.equal(p.status, 201); assert.equal(p.data.file_type, 'pdf'); assert.equal(p.data.file_name, 'Sổ tiêm chủng.pdf');
    const i = await call('POST', url(), { token: S.tokenA, form: fileForm(JPG, 'don-thuoc.jpeg', 'image/jpeg') });
    assert.equal(i.status, 201); assert.equal(i.data.file_type, 'jpg');
    S.docPdf = p.data; S.docJpg = i.data;
  });
  await t.test('invalid file type → 422', async () => {
    const r = await call('POST', url(), { token: S.tokenA, form: fileForm(Buffer.from('hello'), 'notes.txt', 'text/plain') });
    assert.equal(r.status, 422); assert.ok(r.data.errors.file);
  });
  await t.test('content that does not match its extension → 422', async () => {
    const r = await call('POST', url(), { token: S.tokenA, form: fileForm(Buffer.from('<script>x</script>'), 'fake.pdf', 'application/pdf') });
    assert.equal(r.status, 422);
  });
  await t.test('empty file and missing file → 422', async () => {
    assert.equal((await call('POST', url(), { token: S.tokenA, form: fileForm(Buffer.alloc(0), 'a.png', 'image/png') })).status, 422);
    const f = new FormData(); f.append('description', 'x');
    assert.equal((await call('POST', url(), { token: S.tokenA, form: f })).status, 422);
  });
  await t.test('oversized file (> 4 MB) → 413', async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(4 * 1024 * 1024 + 10, 0x20)]);
    const r = await call('POST', url(), { token: S.tokenA, form: fileForm(big, 'big.pdf', 'application/pdf') });
    assert.equal(r.status, 413); assert.ok(r.data.errors.file);
  });
  await t.test('list, view metadata, download exact bytes', async () => {
    const list = await call('GET', url(), { token: S.tokenA });
    assert.equal(list.data.length, 2);
    const meta = await call('GET', '/documents/' + S.docPdf.id, { token: S.tokenA });
    assert.equal(meta.data.description, 'Bản scan');
    const dl = await call('GET', '/documents/' + S.docPdf.id + '/download', { token: S.tokenA });
    assert.equal(dl.status, 200);
    assert.equal(dl.headers.get('content-type'), 'application/pdf');
    assert.match(dl.headers.get('content-disposition'), /^attachment/);
    assert.ok(Buffer.compare(dl.data, PDF) === 0);
    const inline = await call('GET', '/documents/' + S.docJpg.id + '/download?inline=1', { token: S.tokenA });
    assert.match(inline.headers.get('content-disposition'), /^inline/);
  });
  await t.test('delete removes row and file', async () => {
    const row = await db.one('SELECT file_path FROM documents WHERE id = $1', [S.docJpg.id]);
    const abs = path.join(process.env.UPLOAD_DIR, row.file_path.replace(/^\/uploads\//, ''));
    assert.ok(fs.existsSync(abs));
    assert.equal((await call('DELETE', '/documents/' + S.docJpg.id, { token: S.tokenA })).status, 204);
    assert.ok(!fs.existsSync(abs));
    assert.equal((await call('GET', '/documents/' + S.docJpg.id, { token: S.tokenA })).status, 404);
  });
});

test('Authorization: user B cannot touch user A data', async () => {
  const B_ = { token: S.tokenB };
  const pet = '/pets/' + S.petA.id;
  assert.equal((await call('GET', pet, B_)).status, 403);
  assert.equal((await call('PUT', pet, Object.assign({ body: { name: 'x', species: 'Chó', gender: 'Đực' } }, B_))).status, 403);
  assert.equal((await call('DELETE', pet, B_)).status, 403);
  assert.equal((await call('GET', pet + '/health-records', B_)).status, 403);
  assert.equal((await call('POST', pet + '/health-records', Object.assign({ body: { examination_date: today(), reason: 'x' } }, B_))).status, 403);
  assert.equal((await call('GET', '/health-records/' + S.healthA.id, B_)).status, 403);
  assert.equal((await call('PUT', '/health-records/' + S.healthA.id, Object.assign({ body: { examination_date: today(), reason: 'x' } }, B_))).status, 403);
  assert.equal((await call('DELETE', '/health-records/' + S.healthA.id, B_)).status, 403);
  assert.equal((await call('GET', pet + '/vaccinations', B_)).status, 403);
  assert.equal((await call('GET', '/vaccinations/' + S.vaccA.id, B_)).status, 403);
  assert.equal((await call('DELETE', '/vaccinations/' + S.vaccA.id, B_)).status, 403);
  assert.equal((await call('GET', pet + '/documents', B_)).status, 403);
  assert.equal((await call('POST', pet + '/documents', Object.assign({ form: fileForm(PDF, 'x.pdf', 'application/pdf') }, B_))).status, 403);
  assert.equal((await call('GET', '/documents/' + S.docPdf.id, B_)).status, 403);
  assert.equal((await call('GET', '/documents/' + S.docPdf.id + '/download', B_)).status, 403);
  assert.equal((await call('DELETE', '/documents/' + S.docPdf.id, B_)).status, 403);
  const listB = await call('GET', '/pets', B_);
  assert.deepEqual(listB.data.map((p) => p.name), ['Lucky']);
  // A's data is intact
  assert.equal((await call('GET', pet, { token: S.tokenA })).data.name, 'Mochi');
});

test('Account settings', async (t) => {
  await t.test('update name, email, avatar', async () => {
    const r = await call('PUT', '/auth/me', { token: S.tokenA, body: { name: 'An Nguyễn', email: 'an2@example.com', avatar: pngDataUrl } });
    assert.equal(r.status, 200); assert.equal(r.data.email, 'an2@example.com'); assert.match(r.data.avatar, /^\/uploads\/photos\/users\//);
  });
  await t.test('email taken by another user → 409', async () => {
    const r = await call('PUT', '/auth/me', { token: S.tokenA, body: { name: 'An', email: B.email } });
    assert.equal(r.status, 409);
  });
  await t.test('password change needs the current password', async () => {
    const bad = await call('PUT', '/auth/me', { token: S.tokenA, body: { current_password: 'nope', new_password: 'newpass1' } });
    assert.equal(bad.status, 422); assert.ok(bad.data.errors.current_password);
    const ok = await call('PUT', '/auth/me', { token: S.tokenA, body: { current_password: A.password, new_password: 'newpass1' } });
    assert.equal(ok.status, 200);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'an2@example.com', password: 'newpass1' } })).status, 200);
  });
});

test('Delete pet cascades records and files', async () => {
  const id = S.petA.id;
  assert.equal((await call('DELETE', '/pets/' + id, { token: S.tokenA })).status, 204);
  for (const tbl of ['health_records', 'vaccinations', 'documents']) {
    const r = await db.one(`SELECT count(*)::int AS n FROM ${tbl} WHERE pet_id = $1`, [id]);
    assert.equal(r.n, 0, tbl);
  }
  assert.equal((await call('GET', '/pets/' + id, { token: S.tokenA })).status, 404);
});

test('Errors: unknown endpoint 404, wrong method 405, bad JSON 400', async () => {
  assert.equal((await call('GET', '/nope', { token: S.tokenA })).status, 404);
  assert.equal((await call('PATCH', '/pets', { token: S.tokenA, body: {} })).status, 405);
  const r = await fetch(base + '/pets', { method: 'POST', headers: { Authorization: 'Bearer ' + S.tokenA, 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(r.status, 400);
});

test('Configuration: schema module matches db/schema.sql, clear config errors', async () => {
  const file = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  assert.equal(require('../server/schema'), file);
  const saved = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  const r = await call('POST', '/auth/register', { body: { name: 'X', email: 'x@example.com', password: 'secret123' } });
  process.env.JWT_SECRET = saved;
  assert.equal(r.status, 500);
  assert.match(r.data.error, /JWT_SECRET/);
  assert.equal(await db.one("SELECT id FROM users WHERE email = 'x@example.com'"), null, 'nothing written');
});

test('Configuration: connection string fallbacks used by Vercel integrations', () => {
  const keep = Object.assign({}, process.env);
  try {
    delete process.env.DATABASE_URL;
    process.env.POSTGRES_URL = 'postgres://a@b/c';
    assert.equal(db.connectionString(), 'postgres://a@b/c');
    delete process.env.POSTGRES_URL;
    process.env.STORAGE_DATABASE_URL = 'postgresql://d@e/f';
    assert.equal(db.connectionString(), 'postgresql://d@e/f');
  } finally {
    Object.keys(process.env).forEach((k) => { if (!(k in keep)) delete process.env[k]; });
    Object.assign(process.env, keep);
  }
});

test('Configuration: on Vercel without a Blob store, uploads fail with a clear message and nothing is half-saved', async () => {
  process.env.VERCEL = '1';
  try {
    const login = await call('POST', '/auth/login', { body: { email: B.email, password: B.password } });
    const t = login.data.token;
    const before = (await call('GET', '/pets', { token: t })).data.length;
    const r = await call('POST', '/pets', { token: t, body: { name: 'Ảnh', species: 'Mèo', gender: 'Cái', photo: pngDataUrl } });
    assert.equal(r.status, 500);
    assert.match(r.data.error, /BLOB_READ_WRITE_TOKEN/); // shown to the user as-is
    assert.equal((await call('GET', '/pets', { token: t })).data.length, before);
    const ok = await call('POST', '/pets', { token: t, body: { name: 'Không ảnh', species: 'Mèo', gender: 'Cái' } });
    assert.equal(ok.status, 201, 'a pet without photo still saves');
  } finally { delete process.env.VERCEL; }
});
