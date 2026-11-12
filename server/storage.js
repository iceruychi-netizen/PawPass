'use strict';
/*
 * File storage.
 *  - Production (BLOB_READ_WRITE_TOKEN set): Vercel Blob. The stored path is the blob URL.
 *  - Local development: ./uploads (UPLOAD_DIR). The stored path is "/uploads/<key>".
 * Documents are only ever served through GET /api/documents/:id/download (ownership checked).
 * Pet photos and avatars are images shown in <img> tags, so they are served directly.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const localDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));

const MAGIC = {
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.length > 8 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  pdf: (b) => b.length > 4 && b.slice(0, 5).toString('latin1') === '%PDF-'
};
const MIME = { jpg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };

/** True when the bytes really are the claimed type (extension + MIME alone can be faked). */
function sniff(type, buf) { return !!MAGIC[type] && MAGIC[type](buf); }

/** Lower-case, ASCII-only file name safe for a storage key. */
function safeName(name) {
  const base = String(name || 'file').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '').slice(-80) || 'file';
}

async function put(key, buffer, contentType) {
  if (useBlob()) {
    const { put: blobPut } = require('@vercel/blob');
    const r = await blobPut(key, buffer, { access: 'public', contentType, addRandomSuffix: true });
    return r.url;
  }
  const rel = key.replace(/\.(\w+)$/, '-' + crypto.randomBytes(6).toString('hex') + '.$1');
  const abs = path.join(localDir(), rel);
  if (!abs.startsWith(localDir() + path.sep)) throw new Error('Invalid storage key');
  await fs.promises.mkdir(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
  return '/uploads/' + rel.split(path.sep).join('/');
}

async function read(stored) {
  if (/^https:\/\//.test(stored)) {
    const r = await fetch(stored);
    if (!r.ok) throw new Error('Blob fetch failed: ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  }
  return fs.promises.readFile(resolveLocal(stored));
}

async function remove(stored) {
  if (!stored) return;
  try {
    if (/^https:\/\//.test(stored)) {
      if (!useBlob()) return;
      const { del } = require('@vercel/blob');
      await del(stored);
    } else if (/^\/uploads\//.test(stored)) {
      await fs.promises.unlink(resolveLocal(stored));
    }
  } catch (e) { /* the row is gone either way; a leftover file is not a user-facing error */ }
}

function resolveLocal(stored) {
  const rel = String(stored).replace(/^\/uploads\//, '');
  const abs = path.resolve(localDir(), rel);
  if (!abs.startsWith(localDir() + path.sep)) throw new Error('Invalid stored path');
  return abs;
}

/** True for values this app itself stored (so an unchanged photo URL can be sent back). */
function isStoredImage(v) {
  if (/^\/uploads\/photos\/[\w./-]+$/.test(v)) return true;
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/photos\//i.test(v);
}

module.exports = { sniff, safeName, put, read, remove, isStoredImage, localDir, MIME };
