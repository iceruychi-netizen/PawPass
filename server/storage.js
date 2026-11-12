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
  const base = String(name || 'file').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '').slice(-80) || 'file';
}

const { HttpError } = require('./http');
/** Storage problems are shown to the user with the underlying reason, so they can be fixed from the message alone. */
function storageError(message) { return new HttpError(500, message); }

async function blobPut(key, buffer, contentType) {
  const blob = require('@vercel/blob');
  const opts = { contentType, addRandomSuffix: true };
  try {
    return (await blob.put(key, buffer, Object.assign({ access: 'public' }, opts))).url;
  } catch (e) {
    // Stores created as "private" refuse public uploads: retry as private (downloads go through the API anyway).
    if (/private/i.test(String(e && e.message))) return (await blob.put(key, buffer, Object.assign({ access: 'private' }, opts))).url;
    throw e;
  }
}

async function put(key, buffer, contentType) {
  if (useBlob()) {
    try { return await blobPut(key, buffer, contentType); }
    catch (e) {
      console.error('[storage] Vercel Blob upload failed', e);
      throw storageError('Không lưu được ảnh/tài liệu lên Vercel Blob: ' + String((e && e.message) || e).slice(0, 200));
    }
  }
  // Vercel's filesystem is read-only: without a Blob store there is nowhere to keep files.
  if (process.env.VERCEL) throw storageError('Máy chủ chưa được cấu hình kho lưu ảnh/tài liệu (thiếu BLOB_READ_WRITE_TOKEN).');
  const rel = key.replace(/\.(\w+)$/, '-' + crypto.randomBytes(6).toString('hex') + '.$1');
  const abs = path.join(localDir(), rel);
  if (!abs.startsWith(localDir() + path.sep)) throw new Error('Invalid storage key');
  await fs.promises.mkdir(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, buffer);
  return '/uploads/' + rel.split(path.sep).join('/');
}

async function read(stored) {
  if (/^https:\/\//.test(stored)) {
    // Private Blob stores need the token to read; public ones ignore the header.
    const headers = process.env.BLOB_READ_WRITE_TOKEN ? { Authorization: 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN } : {};
    const r = await fetch(stored, { headers });
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
  return /^https:\/\/[a-z0-9-]+\.(public\.|private\.)?blob\.vercel-storage\.com\/photos\//i.test(v);
}

module.exports = { sniff, safeName, put, read, remove, isStoredImage, localDir, MIME };
