// Genera los íconos PNG de la PWA (octágono lima sobre grafito) sin dependencias externas.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x11, 0x14, 0x18];
const LIME = [0xc8, 0xf5, 0x3c];

function crc32(buf) {
  let c, crc = ~0;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(tipo, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(tipo);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ¿(x,y) dentro de un octágono regular de radio r (apotema r*cos(22.5°)) centrado en 0,0?
function enOctagono(x, y, r) {
  const ap = r * Math.cos(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    if (x * Math.cos(a) + y * Math.sin(a) > ap) return false;
  }
  return true;
}

function dibujar(N) {
  const SS = 3;
  const out = Buffer.alloc(N * N * 3);
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      let lime = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / N - 0.5;
          const y = (py + (sy + 0.5) / SS) / N - 0.5;
          const anillo = enOctagono(x, y, 0.33) && !enOctagono(x, y, 0.255);
          const centro = enOctagono(x, y, 0.15);
          if (anillo || centro) lime++;
        }
      }
      const t = lime / (SS * SS);
      for (let c = 0; c < 3; c++) out[(py * N + px) * 3 + c] = Math.round(BG[c] * (1 - t) + LIME[c] * t);
    }
  }
  return png(N, N, out);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', dibujar(192));
writeFileSync('public/icon-512.png', dibujar(512));
writeFileSync('public/apple-touch-icon.png', dibujar(180));
writeFileSync('public/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#111418"/>
<polygon points="${oct(256, 256, 0.33 * 512)}" fill="none" stroke="#c8f53c" stroke-width="${(0.33 - 0.255) * 512 * Math.cos(Math.PI / 8)}"/>
<polygon points="${oct(256, 256, 0.15 * 512)}" fill="#c8f53c"/></svg>`);
function oct(cx, cy, r) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}
console.log('íconos generados');
