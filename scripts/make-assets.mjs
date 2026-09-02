#!/usr/bin/env node
/**
 * Draw every raster asset the site needs, from scratch:
 *
 *   public/icon-192.png            PWA / browser icon
 *   public/icon-512.png            PWA install icon
 *   public/icon-maskable-512.png   Android adaptive icon (art inside the safe circle)
 *   public/apple-touch-icon.png    iOS home screen
 *   public/og-image.png            1200×630 link preview card
 *
 * The mark is the game in one picture: three cream words struck through with a
 * highlighter, an ellipsis either side saying the song keeps going.
 *
 *   node scripts/make-assets.mjs
 */
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas, drawText, textWidth } from "./lib/raster.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

const BLACK = [13, 13, 13];
const SOFT = [23, 23, 23];
const CREAM = [236, 230, 219];
const DIM = [143, 137, 124];
const MARKER = [255, 61, 127];

/** A thick straight stroke as a quad, so diagonals get the same weight. */
function stroke(c, [x1, y1], [x2, y2], width, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (width / 2);
  const ny = (dx / len) * (width / 2);
  c.poly(
    [
      [x1 + nx, y1 + ny],
      [x2 + nx, y2 + ny],
      [x2 - nx, y2 - ny],
      [x1 - nx, y1 - ny],
    ],
    color,
  );
}

/* ----------------------------------------------------------- the LYRIK mark */

/** Each letter is drawn in a 100×140 box; `s` scales it, `x`/`y` place it. */
const LETTERS = {
  L: (c, x, y, s, col) => {
    c.rect(x, y, 30 * s, 140 * s, col);
    c.rect(x, y + 110 * s, 100 * s, 30 * s, col);
  },
  Y: (c, x, y, s, col) => {
    stroke(c, [x + 15 * s, y - 4 * s], [x + 50 * s, y + 76 * s], 30 * s, col);
    stroke(c, [x + 85 * s, y - 4 * s], [x + 50 * s, y + 76 * s], 30 * s, col);
    c.rect(x + 35 * s, y + 66 * s, 30 * s, 74 * s, col);
  },
  R: (c, x, y, s, col) => {
    c.rect(x, y, 30 * s, 140 * s, col);
    c.rect(x, y, 90 * s, 30 * s, col);
    c.rect(x + 60 * s, y, 30 * s, 62 * s, col);
    c.rect(x, y + 52 * s, 90 * s, 30 * s, col);
    stroke(c, [x + 56 * s, y + 74 * s], [x + 100 * s, y + 148 * s], 30 * s, col);
  },
  I: (c, x, y, s, col) => {
    c.rect(x + 35 * s, y, 30 * s, 140 * s, col);
  },
  K: (c, x, y, s, col) => {
    c.rect(x, y, 30 * s, 140 * s, col);
    stroke(c, [x + 26 * s, y + 74 * s], [x + 104 * s, y - 8 * s], 29 * s, col);
    stroke(c, [x + 26 * s, y + 66 * s], [x + 104 * s, y + 148 * s], 29 * s, col);
  },
};

function wordmark(c, text, cx, y, s, color) {
  const advance = 118 * s;
  const total = text.length * advance - 18 * s;
  let x = cx - total / 2;
  for (const ch of text) {
    LETTERS[ch]?.(c, x, y, s, color);
    x += advance;
  }
}

/* ------------------------------------------------------------- the app icon */

/**
 * Three bars (words) struck through by the marker band, with a continuation
 * dot at each end. `inset` shrinks the art for the maskable safe zone.
 */
function drawMark(c, size, inset = 0) {
  const span = size - inset * 2;
  const u = (n) => inset + n * span;

  // The swipe of highlighter. Every word sits *inside* it, so at favicon size
  // the mark still reads as one struck-through line rather than a row of teeth.
  c.rect(u(0.11), u(0.37), span * 0.78, span * 0.26, MARKER);

  // three words knocked out of the swipe, on one baseline
  const words = [
    [0.17, 0.16],
    [0.37, 0.26],
    [0.67, 0.16],
  ];
  for (const [wx, ww] of words) {
    c.rect(u(wx), u(0.44), span * ww, span * 0.12, CREAM);
  }

  // the song carries on in both directions
  const dot = span * 0.05;
  c.rect(u(0.02), u(0.47), dot, dot, DIM);
  c.rect(u(0.98) - dot, u(0.47), dot, dot, DIM);
}

function icon(size, { maskable = false } = {}) {
  const c = new Canvas(size, size);
  c.fill(BLACK);
  c.glow(size * 0.5, size * -0.1, size * 1.05, MARKER, 0.22);
  // Android masks the outer ~10% away on every side; keep the art well inside.
  drawMark(c, size, maskable ? size * 0.19 : size * 0.04);
  return c;
}

/* --------------------------------------------------------------- the OG card */

function ogCard() {
  const W = 1200;
  const H = 630;
  const c = new Canvas(W, H);
  c.fill(BLACK);
  c.glow(W / 2, -60, 820, MARKER, 0.3);

  // top and bottom rules, the dexo.games brutalist frame
  c.rect(0, 0, W, 6, MARKER);
  c.rect(0, H - 6, W, 6, MARKER);

  wordmark(c, "LYRIK", W / 2, 96, 1.05, CREAM);

  // the tape: three words highlighted, ellipsis either side
  const tapeY = 336;
  const tapeH = 116;
  c.rect(180, tapeY, W - 360, tapeH, SOFT);
  c.rect(180, tapeY, W - 360, 3, MARKER);
  c.rect(296, tapeY + 26, 610, 64, MARKER);
  const bars = [
    [318, 118],
    [470, 210],
    [716, 150],
  ];
  for (const [bx, bw] of bars) c.rect(bx, tapeY + 44, bw, 28, CREAM);
  drawText(c, "...", 214, tapeY + 60, 5, DIM, 1, 0.9);
  drawText(c, "...", 930, tapeY + 60, 5, DIM, 1, 0.9);

  const tag = "GUESS THE SONG FROM THREE WORDS";
  drawText(c, tag, (W - textWidth(tag, 5)) / 2, 500, 5, CREAM, 1, 0.92);

  const url = "LYRIK.DEXO.GAMES";
  drawText(c, url, (W - textWidth(url, 4)) / 2, 562, 4, MARKER);

  return c;
}

/* ---------------------------------------------------------------------- run */

const OUTPUTS = [
  ["icon-192.png", () => icon(192)],
  ["icon-512.png", () => icon(512)],
  ["icon-maskable-512.png", () => icon(512, { maskable: true })],
  ["apple-touch-icon.png", () => icon(180)],
  ["og-image.png", ogCard],
];

for (const [name, make] of OUTPUTS) {
  const png = make().toPNG();
  await writeFile(join(PUBLIC, name), png);
  console.log(`  ${name.padEnd(24)} ${(png.length / 1024).toFixed(1)} KB`);
}
console.log("\nassets written to public/");
