'use strict';
/* Local development server: static frontend + the same API handler Vercel runs. `npm run dev` */
const http = require('http');
const fs = require('fs');
const path = require('path');

require('./env').load();
const api = require('./app');
const storage = require('./storage');

const PUBLIC = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };

function serveFile(res, file, extraHeaders) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, Object.assign({ 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }, extraHeaders || {}));
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/api' || pathname.startsWith('/api/')) return api(req, res);
  // Only photos/avatars are public; documents go through the authorised download endpoint.
  if (pathname.startsWith('/uploads/photos/')) {
    const abs = path.resolve(storage.localDir(), pathname.replace(/^\/uploads\//, ''));
    if (!abs.startsWith(path.join(storage.localDir(), 'photos') + path.sep)) { res.writeHead(404); res.end(); return; }
    return serveFile(res, abs);
  }
  let file = path.resolve(PUBLIC, '.' + pathname);
  if (!file.startsWith(PUBLIC)) { res.writeHead(404); res.end(); return; }
  if (pathname === '/' || !path.extname(file)) file = path.join(PUBLIC, 'index.html');
  serveFile(res, file);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log('PawPass running at http://localhost:' + port));
