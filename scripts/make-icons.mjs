/**
 * Draws the app icons. No image library — a PNG is a handful of chunks around a
 * zlib stream, and the mark is rectangles, so writing the encoder is cheaper
 * than taking on a dependency.
 *
 *   node scripts/make-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'public', 'icons');

const BG = [0x0a, 0x0b, 0x0e];
const ACCENT = [0x4b, 0x8b, 0xf5];
const ACCENT_DIM = [0x2f, 0x6f, 0xe0];

// --- PNG ---------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** pixels: (x, y) => [r, g, b] */
function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- the mark ----------------------------------------------------------------

/**
 * A barbell: a bar across the middle with a plate at each end. `scale` shrinks
 * the mark for the maskable icon, which has to survive being cropped to a circle.
 */
function barbell(size, scale) {
  const c = size / 2;
  const unit = (size * scale) / 2;

  const barHalfHeight = unit * 0.11;
  const barHalfWidth = unit * 0.92;
  const innerPlateX = unit * 0.5;
  const innerPlateHalfHeight = unit * 0.42;
  const outerPlateX = unit * 0.72;
  const outerPlateHalfHeight = unit * 0.64;

  return (x, y) => {
    const dx = Math.abs(x + 0.5 - c);
    const dy = Math.abs(y + 0.5 - c);

    // Outer plates.
    if (dx >= outerPlateX && dx <= outerPlateX + unit * 0.2 && dy <= outerPlateHalfHeight) {
      return ACCENT;
    }
    // Inner plates.
    if (dx >= innerPlateX && dx <= innerPlateX + unit * 0.18 && dy <= innerPlateHalfHeight) {
      return ACCENT_DIM;
    }
    // The bar.
    if (dx <= barHalfWidth && dy <= barHalfHeight) {
      return ACCENT;
    }
    return BG;
  };
}

mkdirSync(OUT, { recursive: true });

for (const [name, size, scale] of [
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  ['icon-512-maskable.png', 512, 0.56],
]) {
  writeFileSync(resolve(OUT, name), encodePng(size, barbell(size, scale)));
  console.log(`wrote icons/${name} (${size}x${size})`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0a0b0e"/>
  <rect x="4" y="14.6" width="24" height="2.8" rx="1.4" fill="#4b8bf5"/>
  <rect x="8.4" y="10.4" width="2.6" height="11.2" rx="1" fill="#2f6fe0"/>
  <rect x="21" y="10.4" width="2.6" height="11.2" rx="1" fill="#2f6fe0"/>
  <rect x="4.6" y="8.2" width="3" height="15.6" rx="1.2" fill="#4b8bf5"/>
  <rect x="24.4" y="8.2" width="3" height="15.6" rx="1.2" fill="#4b8bf5"/>
</svg>
`;
writeFileSync(resolve(HERE, '..', 'public', 'favicon.svg'), favicon);
console.log('wrote favicon.svg');
