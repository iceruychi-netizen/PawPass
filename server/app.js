'use strict';
/*
 * PawPass REST API — every endpoint from Step 2 · API Documentation, under /api.
 * Exported as a plain (req, res) handler: Vercel runs it as a Function (api/index.js),
 * and server/local.js mounts it for local development.
 */
const db = require('./db');
const storage = require('./storage');
const { hashPassword, verifyPassword, signToken, verifyToken, assertConfigured } = require('./security');
const { HttpError, fail, invalid, send, readJson, readMultipart, createRouter } = require('./http');
const VAL = require('../public/js/validators');

const { V, LIMITS, hasErr, empty, ext, parseWeight } = VAL;
const JSON_LIMIT = 4 * 1024 * 1024;           // a 2 MB photo as a data URL is ~2.7 MB
const UPLOAD_LIMIT = LIMITS.documentBytes + 64 * 1024; // file + multipart overhead, under Vercel's 4.5 MB

// "Not in the future" is checked against the latest calendar date anywhere (UTC+14),
// so a user ahead of the server's UTC clock is never rejected for entering today.
VAL.clock.today = () => new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 10);

const router = createRouter();
const r = (method, pattern, fn, opts) => router.add(method, pattern, Object.assign(fn, { auth: !(opts && opts.public), multipart: !!(opts && opts.multipart) }));

/* ---------- helpers ---------- */
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar || '', created_at: u.created_at, updated_at: u.updated_at });
const txt = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const check = (errors) => { if (hasErr(errors)) throw invalid(errors); };
const EMAIL_USED = 'Email đã được sử dụng.';

function bearer(req) {
  const h = String(req.headers.authorization || '');
  return /^Bearer\s+(.+)$/i.test(h) ? h.replace(/^Bearer\s+/i, '').trim() : '';
}

/**
 * Resolves the image field of a pet (photo) or user (avatar):
 *   undefined → unchanged · '' → removed · current value → unchanged · data:image/... → stored as a new file.
 */
async function resolveImage(value, current, keyPrefix, field) {
  if (value === undefined || value === current) return { value: current || null, replaced: null };
  if (value === '' || value === null) return { value: null, replaced: current || null };
  const m = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(value));
  if (!m) {
    if (storage.isStoredImage(value)) return { value: current || null, replaced: null };
    throw invalid({ [field]: 'Ảnh chỉ hỗ trợ định dạng JPG hoặc PNG.' });
  }
  const buf = Buffer.from(m[2], 'base64');
  const type = m[1] === 'image/png' ? 'png' : 'jpg';
  if (buf.length > LIMITS.photoBytes) throw invalid({ [field]: 'Ảnh vượt quá giới hạn 2 MB.' });
  if (!buf.length || !storage.sniff(type, buf)) throw invalid({ [field]: 'Ảnh chỉ hỗ trợ định dạng JPG hoặc PNG.' });
  const url = await storage.put(keyPrefix + '/' + Date.now() + '.' + type, buf, storage.MIME[type]);
  return { value: url, replaced: current || null };
}

async function ownedPet(id, uid) {
  const pet = await db.one('SELECT * FROM pets WHERE id = $1', [id]);
  if (!pet) throw fail(404, 'Không tìm thấy thú cưng.');
  if (pet.user_id !== uid) throw fail(403, 'Bạn không có quyền truy cập thú cưng này.');
  return pet;
}

/* ---------- auth ---------- */
r('POST', '/auth/register', async ({ body }) => {
  check(V.register(body));
  const email = String(body.email).trim().toLowerCase();
  if (await db.one('SELECT id FROM users WHERE email = $1', [email])) throw fail(409, EMAIL_USED, { email: 'Email này đã được đăng ký.' });
  const hash = await hashPassword(body.password);
  const user = await db.one(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [String(body.name).trim(), email, hash]);
  return { status: 201, data: { user: publicUser(user), token: signToken(user.id) } };
}, { public: true });

const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');
r('POST', '/auth/login', async ({ body }) => {
  check(V.login(body));
  const user = await db.one('SELECT * FROM users WHERE email = $1', [String(body.email).trim().toLowerCase()]);
  // Same work and same message whether or not the email exists.
  const ok = await verifyPassword(body.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw fail(401, 'Email hoặc mật khẩu không đúng.');
  return { data: { user: publicUser(user), token: signToken(user.id) } };
}, { public: true });

r('POST', '/auth/logout', async () => ({ status: 204 }));

r('GET', '/auth/me', async ({ user }) => ({ data: publicUser(user) }));

r('PUT', '/auth/me', async ({ user, body }) => {
  if (body.new_password !== undefined) {
    check(V.password(body));
    if (!(await verifyPassword(body.current_password, user.password_hash))) {
      throw fail(422, 'Mật khẩu hiện tại không đúng.', { current_password: 'Mật khẩu hiện tại không đúng.' });
    }
    const updated = await db.one('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [await hashPassword(body.new_password), user.id]);
    return { data: publicUser(updated) };
  }
  check(V.account(body));
  const email = String(body.email).trim().toLowerCase();
  if (await db.one('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, user.id])) {
    throw fail(409, EMAIL_USED, { email: 'Email này đã được tài khoản khác sử dụng.' });
  }
  const img = await resolveImage(body.avatar, user.avatar, 'photos/users/' + user.id, 'avatar');
  const updated = await db.one('UPDATE users SET name = $1, email = $2, avatar = $3, updated_at = now() WHERE id = $4 RETURNING *',
    [String(body.name).trim(), email, img.value, user.id]);
  if (img.replaced) await storage.remove(img.replaced);
  return { data: publicUser(updated) };
});

/* ---------- pets ---------- */
function petValues(b) {
  return [txt(b.name), b.species, txt(b.breed), b.gender, txt(b.date_of_birth),
    empty(b.weight) ? null : Math.round(parseWeight(b.weight) * 100) / 100,
    txt(b.color), txt(b.description), txt(b.notes)];
}

r('GET', '/pets', async ({ user }) => ({ data: await db.query('SELECT * FROM pets WHERE user_id = $1 ORDER BY created_at, id', [user.id]) }));

r('POST', '/pets', async ({ user, body }) => {
  check(V.pet(body));
  const pet = await db.one(
    `INSERT INTO pets (user_id, name, species, breed, gender, date_of_birth, weight, color, description, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [user.id].concat(petValues(body)));
  if (!empty(body.photo)) {
    try {
      const img = await resolveImage(body.photo, null, 'photos/pets/' + pet.id, 'photo');
      return { status: 201, data: await db.one('UPDATE pets SET photo = $1 WHERE id = $2 RETURNING *', [img.value, pet.id]) };
    } catch (e) { await db.query('DELETE FROM pets WHERE id = $1', [pet.id]); throw e; }
  }
  return { status: 201, data: pet };
});

r('GET', '/pets/:id', async ({ user, params }) => ({ data: await ownedPet(params.id, user.id) }));

r('PUT', '/pets/:id', async ({ user, params, body }) => {
  const pet = await ownedPet(params.id, user.id);
  check(V.pet(body));
  const img = await resolveImage(body.photo, pet.photo, 'photos/pets/' + pet.id, 'photo');
  const updated = await db.one(
    `UPDATE pets SET name = $1, species = $2, breed = $3, gender = $4, date_of_birth = $5, weight = $6,
       color = $7, description = $8, notes = $9, photo = $10, updated_at = now()
     WHERE id = $11 RETURNING *`, petValues(body).concat([img.value, pet.id]));
  if (img.replaced) await storage.remove(img.replaced);
  return { data: updated };
});

r('DELETE', '/pets/:id', async ({ user, params }) => {
  const pet = await ownedPet(params.id, user.id);
  const docs = await db.query('SELECT file_path FROM documents WHERE pet_id = $1', [pet.id]);
  await db.query('DELETE FROM pets WHERE id = $1', [pet.id]); // health_records, vaccinations, documents cascade
  await Promise.all(docs.map((d) => storage.remove(d.file_path)).concat([storage.remove(pet.photo)]));
  return { status: 204 };
});

/* ---------- health records & vaccinations (same shape) ---------- */
const RECORDS = {
  'health-records': {
    table: 'health_records', validate: V.health, order: 'examination_date DESC, id DESC', notFound: 'Không tìm thấy hồ sơ sức khỏe.',
    fields: ['examination_date', 'reason', 'diagnosis', 'treatment', 'medication', 'notes']
  },
  vaccinations: {
    table: 'vaccinations', validate: V.vacc, order: 'vaccination_date DESC, id DESC', notFound: 'Không tìm thấy thông tin tiêm chủng.',
    fields: ['vaccine_name', 'vaccination_date', 'dose', 'notes']
  }
};

async function ownedRecord(T, id, uid) {
  const row = await db.one(`SELECT r.*, p.user_id AS owner_id FROM ${T.table} r JOIN pets p ON p.id = r.pet_id WHERE r.id = $1`, [id]);
  if (!row) throw fail(404, T.notFound);
  if (row.owner_id !== uid) throw fail(403, 'Bạn không có quyền truy cập dữ liệu này.');
  delete row.owner_id;
  return row;
}

Object.keys(RECORDS).forEach((seg) => {
  const T = RECORDS[seg];
  const cols = T.fields.join(', ');
  r('GET', '/pets/:id/' + seg, async ({ user, params }) => {
    const pet = await ownedPet(params.id, user.id);
    return { data: await db.query(`SELECT * FROM ${T.table} WHERE pet_id = $1 ORDER BY ${T.order}`, [pet.id]) };
  });
  r('POST', '/pets/:id/' + seg, async ({ user, params, body }) => {
    const pet = await ownedPet(params.id, user.id);
    check(T.validate(body));
    const vals = T.fields.map((f) => txt(body[f]));
    const ph = T.fields.map((_, i) => '$' + (i + 2)).join(', ');
    return { status: 201, data: await db.one(`INSERT INTO ${T.table} (pet_id, ${cols}) VALUES ($1, ${ph}) RETURNING *`, [pet.id].concat(vals)) };
  });
  r('GET', '/' + seg + '/:id', async ({ user, params }) => ({ data: await ownedRecord(T, params.id, user.id) }));
  r('PUT', '/' + seg + '/:id', async ({ user, params, body }) => {
    const row = await ownedRecord(T, params.id, user.id);
    check(T.validate(body));
    const sets = T.fields.map((f, i) => f + ' = $' + (i + 1)).join(', ');
    const vals = T.fields.map((f) => txt(body[f]));
    return { data: await db.one(`UPDATE ${T.table} SET ${sets}, updated_at = now() WHERE id = $${T.fields.length + 1} RETURNING *`, vals.concat([row.id])) };
  });
  r('DELETE', '/' + seg + '/:id', async ({ user, params }) => {
    const row = await ownedRecord(T, params.id, user.id);
    await db.query(`DELETE FROM ${T.table} WHERE id = $1`, [row.id]);
    return { status: 204 };
  });
});

/* ---------- documents ---------- */
const DOCS = { table: 'documents', notFound: 'Không tìm thấy tài liệu.' };
const docPublic = (d) => ({ id: d.id, pet_id: d.pet_id, file_name: d.file_name, file_type: d.file_type, file_path: d.file_path, description: d.description || '', uploaded_at: d.uploaded_at });

r('GET', '/pets/:id/documents', async ({ user, params }) => {
  const pet = await ownedPet(params.id, user.id);
  return { data: (await db.query('SELECT * FROM documents WHERE pet_id = $1 ORDER BY uploaded_at DESC, id DESC', [pet.id])).map(docPublic) };
});

r('POST', '/pets/:id/documents', async ({ user, params, req }) => {
  const pet = await ownedPet(params.id, user.id);
  const form = await readMultipart(req, UPLOAD_LIMIT);
  const file = form.files.file;
  const description = form.fields.description || '';
  const meta = file ? { name: file.filename, type: file.type, size: file.data.length } : null;
  const errors = V.doc({ file: meta, description });
  if (errors.file && /4 MB/.test(errors.file)) throw fail(413, errors.file, errors);
  check(errors);
  let type = ext(meta.name); if (type === 'jpeg') type = 'jpg';
  if (!storage.sniff(type, file.data)) throw invalid({ file: 'Nội dung tệp không khớp định dạng ' + type.toUpperCase() + '.' });
  const key = 'pets/' + pet.id + '/' + Date.now() + '-' + storage.safeName(meta.name);
  const stored = await storage.put(key, file.data, storage.MIME[type]);
  try {
    const doc = await db.one(
      'INSERT INTO documents (pet_id, file_name, file_type, file_path, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [pet.id, String(meta.name).slice(0, 255), type, stored, txt(description)]);
    return { status: 201, data: docPublic(doc) };
  } catch (e) { await storage.remove(stored); throw e; }
}, { multipart: true });

r('GET', '/documents/:id', async ({ user, params }) => ({ data: docPublic(await ownedRecord(DOCS, params.id, user.id)) }));

r('GET', '/documents/:id/download', async ({ user, params, query }) => {
  const doc = await ownedRecord(DOCS, params.id, user.id);
  let buf;
  try { buf = await storage.read(doc.file_path); } catch (e) { throw fail(404, 'Không tìm thấy tệp trong bộ lưu trữ.'); }
  const disposition = query.get('inline') === '1' ? 'inline' : 'attachment';
  const ascii = storage.safeName(doc.file_name);
  return {
    raw: buf,
    headers: {
      'Content-Type': storage.MIME[doc.file_type] || 'application/octet-stream',
      'Content-Length': buf.length,
      'Content-Disposition': `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
    }
  };
});

r('DELETE', '/documents/:id', async ({ user, params }) => {
  const doc = await ownedRecord(DOCS, params.id, user.id);
  await db.query('DELETE FROM documents WHERE id = $1', [doc.id]);
  await storage.remove(doc.file_path);
  return { status: 204 };
});

/* ---------- request handling ---------- */
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  try {
    assertConfigured(); // fail fast with a clear message instead of half-completing a request
    const hit = router.match(req.method, path);
    if (!hit) throw fail(404, 'Không tìm thấy endpoint.');
    if (hit.notAllowed) throw fail(405, 'Phương thức không được hỗ trợ.');
    const ctx = { req, params: hit.params, query: url.searchParams, body: {} };
    if (hit.handler.auth) {
      const uid = verifyToken(bearer(req));
      const user = uid && (await db.one('SELECT * FROM users WHERE id = $1', [uid]));
      if (!user) throw fail(401, 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      ctx.user = user;
    }
    if ((req.method === 'POST' || req.method === 'PUT') && !hit.handler.multipart) {
      ctx.body = await readJson(req, JSON_LIMIT);
    }
    const out = await hit.handler(ctx);
    if (out.raw) {
      res.writeHead(200, out.headers);
      res.end(out.raw);
      return;
    }
    send(res, out.status || 200, out.status === 204 ? undefined : out.data);
  } catch (err) {
    if (err instanceof HttpError) {
      const payload = { error: err.message };
      if (err.errors) payload.errors = err.errors;
      send(res, err.status, payload);
      return;
    }
    if (err && err.code === '23505') { send(res, 409, { error: EMAIL_USED, errors: { email: EMAIL_USED } }); return; }
    console.error('[api]', req.method, path, (err && err.code) || '', err);
    let message = 'Lỗi máy chủ. Vui lòng thử lại.';
    if (err && err.code === 'PAWPASS_NO_DB_URL') message = 'Máy chủ chưa được cấu hình cơ sở dữ liệu (thiếu DATABASE_URL).';
    else if (err && err.code === 'PAWPASS_NO_JWT') message = 'Máy chủ chưa được cấu hình JWT_SECRET.';
    else if (db.isConnectionError(err)) message = 'Không kết nối được cơ sở dữ liệu. Vui lòng thử lại sau.';
    send(res, 500, { error: message });
  }
}

module.exports = handle;
module.exports.handle = handle;
