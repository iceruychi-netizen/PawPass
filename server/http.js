'use strict';
/* Minimal HTTP helpers: errors, JSON/multipart body parsing, a tiny router. No framework needed. */

class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || undefined;
  }
}
const fail = (status, message, errors) => new HttpError(status, message, errors);
const invalid = (errors) => new HttpError(422, 'Dữ liệu không hợp lệ.', errors);

function send(res, status, data, headers) {
  if (res.headersSent) return;
  const h = Object.assign({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, headers || {});
  if (status === 204 || data === undefined) { res.writeHead(status, h); res.end(); return; }
  const body = JSON.stringify(data);
  h['Content-Type'] = 'application/json; charset=utf-8';
  res.writeHead(status, h);
  res.end(body);
}

function readRaw(req, limit) {
  // Vercel may already have buffered the body for us.
  if (Buffer.isBuffer(req.rawBody)) return Promise.resolve(req.rawBody);
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) { done = true; reject(fail(413, 'Dữ liệu gửi lên quá lớn.')); req.resume(); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
  });
}

async function readJson(req, limit) {
  const raw = await readRaw(req, limit);
  if (!raw.length) return {};
  try {
    const v = JSON.parse(raw.toString('utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v;
  } catch (e) { throw fail(400, 'Dữ liệu JSON không hợp lệ.'); }
}

/** Parses multipart/form-data held in memory. Returns {fields, files:{name:{filename,type,data}}}. */
async function readMultipart(req, limit) {
  const ct = String(req.headers['content-type'] || '');
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
  if (!/^multipart\/form-data/i.test(ct) || !m) throw fail(400, 'Yêu cầu phải là multipart/form-data.');
  const len = Number(req.headers['content-length'] || 0);
  if (len > limit) throw fail(413, 'Tệp vượt quá giới hạn 4 MB.', { file: 'Tệp vượt quá giới hạn 4 MB.' });
  let raw;
  try { raw = await readRaw(req, limit); }
  catch (e) { if (e.status === 413) throw fail(413, 'Tệp vượt quá giới hạn 4 MB.', { file: 'Tệp vượt quá giới hạn 4 MB.' }); throw e; }
  const boundary = Buffer.from('--' + (m[1] || m[2]).trim());
  const out = { fields: {}, files: {} };
  let pos = raw.indexOf(boundary);
  while (pos !== -1) {
    pos += boundary.length;
    if (raw.slice(pos, pos + 2).toString() === '--') break;
    pos += 2; // CRLF
    const headEnd = raw.indexOf('\r\n\r\n', pos);
    if (headEnd === -1) break;
    const head = raw.slice(pos, headEnd).toString('utf8');
    const next = raw.indexOf(boundary, headEnd + 4);
    if (next === -1) break;
    const data = raw.slice(headEnd + 4, next - 2); // strip CRLF before boundary
    const name = /name="([^"]*)"/i.exec(head);
    const filename = /filename\*?="?([^";\r\n]*)"?/i.exec(head);
    const type = /content-type:\s*([^\r\n;]+)/i.exec(head);
    if (name) {
      if (filename) {
        const fn = filename[1];
        out.files[name[1]] = { filename: fn, type: type ? type[1].trim().toLowerCase() : '', data };
      } else out.fields[name[1]] = data.toString('utf8');
    }
    pos = next;
  }
  return out;
}

/** Router: add(method, '/pets/:id', handler). Handlers receive (ctx) and return {status, data, headers?, raw?}. */
function createRouter() {
  const routes = [];
  return {
    add(method, pattern, handler) {
      const keys = [];
      const re = new RegExp('^' + pattern.replace(/\/:([a-z]+)/gi, (_, k) => { keys.push(k); return '/(\\d+)'; }) + '/?$');
      routes.push({ method, re, keys, handler });
    },
    match(method, path) {
      let pathMatched = false;
      for (const r of routes) {
        const m = r.re.exec(path);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== method) continue;
        const params = {};
        r.keys.forEach((k, i) => { params[k] = Number(m[i + 1]); });
        return { handler: r.handler, params };
      }
      return pathMatched ? { notAllowed: true } : null;
    }
  };
}

module.exports = { HttpError, fail, invalid, send, readJson, readMultipart, createRouter };
