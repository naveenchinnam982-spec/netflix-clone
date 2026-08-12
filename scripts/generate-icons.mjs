// ============================
// PWA Icon Generator
// ============================
// Generates the PWA/favicon PNG icons referenced by public/manifest.json and
// src/app/layout.tsx. Pure Node (zlib + manual PNG encoding) — no canvas or
// image libraries required.
//
// Usage:  node scripts/generate-icons.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---------- Minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels /* RGBA buffer */) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  // Raw scanlines with filter byte 0 per row
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Drawing ----------
const BG = [20, 20, 20, 255]; // #141414
const RED = [229, 9, 20, 255]; // #E50914
const WHITE = [255, 255, 255, 255];

function inTriangle(px, py, a, b, c) {
  const sign = (x1, y1, x2, y2, x3, y3) =>
    (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, a[0], a[1], b[0], b[1]);
  const d2 = sign(px, py, b[0], b[1], c[0], c[1]);
  const d3 = sign(px, py, c[0], c[1], a[0], a[1]);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  // Play triangle ~ 55% of the canvas
  const r = size * 0.28;
  const a = [cx - r * 0.9, cy - r];
  const b = [cx - r * 0.9, cy + r];
  const c = [cx + r * 1.1, cy];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = inTriangle(x + 0.5, y + 0.5, a, b, c);
      const col = inside ? RED : BG;
      // Rounded-corner mask (12.5% radius) so the icon looks good as maskable
      const corner = size * 0.125;
      let alpha = 255;
      const dx = x < corner ? corner - x : x > size - corner ? x - (size - corner) : 0;
      const dy = y < corner ? corner - y : y > size - corner ? y - (size - corner) : 0;
      if (dx > 0 && dy > 0 && dx * dx + dy * dy > corner * corner) alpha = 0;
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = alpha;
    }
  }
  return encodePng(size, buf);
}

const icons = [
  [16, 'favicon-16x16.png'],
  [32, 'favicon-32x32.png'],
  [48, 'favicon-48x48.png'],
  [72, 'icon-72x72.png'],
  [96, 'icon-96x96.png'],
  [128, 'icon-128x128.png'],
  [144, 'icon-144x144.png'],
  [152, 'icon-152x152.png'],
  [192, 'icon-192x192.png'],
  [180, 'apple-touch-icon.png'],
  [384, 'icon-384x384.png'],
  [512, 'icon-512x512.png'],
];

for (const [size, name] of icons) {
  const png = drawIcon(size);
  const path = join(outDir, name);
  writeFileSync(path, png);
  // Also mirror favicon-32/48 as the root favicon.ico (PNG data, .ico name).
  if (size === 48) writeFileSync(join(root, 'public', 'favicon.ico'), png);
  if (size === 180) writeFileSync(join(root, 'public', 'apple-touch-icon.png'), png);
  if (size === 16) writeFileSync(join(root, 'public', 'favicon-16x16.png'), png);
  if (size === 32) writeFileSync(join(root, 'public', 'favicon-32x32.png'), png);
  console.log(`Generated ${name} (${size}x${size})`);
}
console.log('Done.');
