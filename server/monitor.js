'use strict';
/*
 * Theo dõi lỗi máy chủ bằng Sentry — không cần thư viện, gửi thẳng qua HTTP theo định dạng "envelope" của Sentry.
 *  - Bật khi có biến môi trường SENTRY_DSN (Vercel → Settings → Environment Variables).
 *  - Chỉ gửi lỗi 5xx (lỗi của máy chủ). Lỗi người dùng nhập sai (4xx) không gửi.
 *  - Không gửi mật khẩu, token hay nội dung request: chỉ phương thức, đường dẫn (đã thay số id bằng :id) và stack trace.
 */
const crypto = require('crypto');

/** "https://<key>@o123.ingest.sentry.io/456" → { url, key } hoặc null nếu DSN sai / không có. */
function parseDsn(dsn) {
  const m = /^(https?):\/\/([^@:/]+)(?::[^@]*)?@([^/]+)\/(?:(.*)\/)?(\d+)$/.exec(String(dsn || '').trim());
  if (!m) return null;
  const [, proto, key, host, prefix, project] = m;
  return { key, url: `${proto}://${host}/${prefix ? prefix + '/' : ''}api/${project}/envelope/` };
}

/** Đường dẫn không chứa id cụ thể, để các lỗi giống nhau được gom chung: /api/pets/12 → /api/pets/:id */
function routeName(path) { return String(path || '').replace(/\/\d+(?=\/|$)/g, '/:id'); }

function stackFrames(err) {
  return String((err && err.stack) || '').split('\n').slice(1, 30).map((line) => {
    const m = /at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line.trim());
    return m ? { function: m[1] || '?', filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: !/node_modules|node:/.test(m[2]) } : null;
  }).filter(Boolean).reverse(); // Sentry muốn khung gọi cũ nhất đứng trước
}

/** Dựng envelope Sentry cho một lỗi. Tách riêng để test được mà không cần mạng. */
function buildEnvelope(err, ctx, dsnKeyless) {
  const eventId = crypto.randomBytes(16).toString('hex');
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: 'error',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    server_name: 'pawpass-api',
    transaction: ctx && ctx.method ? `${ctx.method} ${routeName(ctx.path)}` : undefined,
    tags: { status: String((ctx && ctx.status) || 500), code: String((err && err.code) || '') },
    exception: { values: [{ type: (err && err.name) || 'Error', value: String((err && err.message) || err).slice(0, 500), stacktrace: { frames: stackFrames(err) } }] }
  };
  const header = { event_id: eventId, sent_at: new Date().toISOString(), dsn: dsnKeyless };
  const body = JSON.stringify(event);
  return { eventId, envelope: [JSON.stringify(header), JSON.stringify({ type: 'event', length: Buffer.byteLength(body) }), body].join('\n') };
}

/** Gửi lỗi lên Sentry. Không bao giờ ném lỗi ra ngoài; chờ tối đa 1,5 giây để không làm chậm phản hồi. */
async function captureException(err, ctx) {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return null;
  const { eventId, envelope } = buildEnvelope(err, ctx, process.env.SENTRY_DSN);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 1500);
    await fetch(dsn.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=pawpass-monitor/1.0, sentry_key=${dsn.key}`
      },
      body: envelope,
      signal: ctl.signal
    });
    clearTimeout(timer);
    return eventId;
  } catch (e) {
    console.error('[monitor] could not reach Sentry:', e.message);
    return null;
  }
}

/** Cấu hình công khai cho trình duyệt: mã Google Analytics và DSN Sentry phía trình duyệt (cả hai vốn là thông tin công khai). */
function publicConfig() {
  const ga = String(process.env.GA_MEASUREMENT_ID || '').trim();
  const dsn = String(process.env.SENTRY_DSN_BROWSER || process.env.SENTRY_DSN || '').trim();
  return {
    gaId: /^G-[A-Z0-9]{4,}$/.test(ga) ? ga : null,
    sentryDsn: parseDsn(dsn) ? dsn : null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  };
}

module.exports = { captureException, publicConfig, parseDsn, buildEnvelope, routeName };
