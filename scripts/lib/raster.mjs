/**
 * A very small RGBA raster canvas + PNG encoder, with no dependencies.
 *
 * Lyrik's artwork is flat colour, straight edges and one bitmap face, so a
 * hundred lines of scanline filling beats pulling in a headless browser or a
 * native image library just to turn an SVG into the handful of PNGs a web app
 * needs (icons, maskable icon, apple-touch-icon, OG card).
 */
import { deflateSync } from "node:zlib";

/* ------------------------------------------------------------------ canvas */

export class Canvas {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.px = new Uint8ClampedArray(width * height * 4);
  }

  /** Straight "source-over" of one pixel. */
  blend(x, y, [r, g, b], alpha) {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const a = Math.min(1, alpha);
    const dstA = this.px[i + 3] / 255;
    const outA = a + dstA * (1 - a);
    if (outA <= 0) return;
    for (let c = 0; c < 3; c++) {
      const src = [r, g, b][c];
      this.px[i + c] = (src * a + this.px[i + c] * dstA * (1 - a)) / outA;
    }
    this.px[i + 3] = outA * 255;
  }

  fill(color, alpha = 1) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.blend(x, y, color, alpha);
  }

  rect(x, y, w, h, color, alpha = 1) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let yy = y0; yy < y0 + Math.round(h); yy++) {
      for (let xx = x0; xx < x0 + Math.round(w); xx++) this.blend(xx, yy, color, alpha);
    }
  }

  /** Convex or concave polygon, 3×3 supersampled so diagonals stay clean. */
  poly(points, color, alpha = 1) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.max(0, Math.floor(Math.min(...xs)));
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(...xs)));
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    const S = 3;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let hits = 0;
        for (let sy = 0; sy < S; sy++) {
          for (let sx = 0; sx < S; sx++) {
            if (inside(points, x + (sx + 0.5) / S, y + (sy + 0.5) / S)) hits++;
          }
        }
        if (hits) this.blend(x, y, color, (alpha * hits) / (S * S));
      }
    }
  }

  /** Soft radial wash — the brand glow behind the artwork. */
  glow(cx, cy, radius, color, peak = 1) {
    const r2 = radius * radius;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 >= r2) continue;
        const t = 1 - Math.sqrt(d2) / radius;
        this.blend(x, y, color, peak * t * t);
      }
    }
  }

  toPNG() {
    return encodePNG(this.w, this.h, this.px);
  }
}

function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/* -------------------------------------------------------------- 5×7 bitmap */

/** Uppercase, digits and a little punctuation — all the OG card needs. */
const GLYPHS = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01111 10000 10000 10000 10000 10000 01111",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01111 10000 10000 10011 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "11111 00100 00100 00100 00100 00100 11111",
  J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 11011 10001",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  0: "01110 10001 10011 10101 11001 10001 01110",
  1: "00100 01100 00100 00100 00100 00100 01110",
  2: "01110 10001 00001 00110 01000 10000 11111",
  3: "11110 00001 00001 01110 00001 00001 11110",
  4: "00010 00110 01010 10010 11111 00010 00010",
  5: "11111 10000 11110 00001 00001 10001 01110",
  6: "01110 10000 11110 10001 10001 10001 01110",
  7: "11111 00001 00010 00100 01000 01000 01000",
  8: "01110 10001 10001 01110 10001 10001 01110",
  9: "01110 10001 10001 01111 00001 00001 01110",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  ",": "00000 00000 00000 00000 01100 01100 11000",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  "'": "01100 01100 11000 00000 00000 00000 00000",
  "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00110 00100 00000 00100",
  ":": "00000 01100 01100 00000 01100 01100 00000",
  "/": "00001 00010 00010 00100 01000 01000 10000",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};

const GLYPH_W = 5;
const GLYPH_H = 7;

/** Pixel width of `text` at `scale`, with `track` pixels between glyphs. */
export function textWidth(text, scale, track = 1) {
  const n = text.length;
  return n * GLYPH_W * scale + Math.max(0, n - 1) * track * scale;
}

/** Draw uppercase pixel text. Unknown characters render as a space. */
export function drawText(canvas, text, x, y, scale, color, track = 1, alpha = 1) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const rows = (GLYPHS[ch] ?? GLYPHS[" "]).split(" ");
    for (let r = 0; r < GLYPH_H; r++) {
      for (let c = 0; c < GLYPH_W; c++) {
        if (rows[r][c] === "1") {
          canvas.rect(cx + c * scale, y + r * scale, scale, scale, color, alpha);
        }
      }
    }
    cx += (GLYPH_W + track) * scale;
  }
  return cx;
}

/* ---------------------------------------------------------------- encoding */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // One filter byte (0 = none) in front of every scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
