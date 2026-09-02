/**
 * Lyric cleaner — turns any raw lyric dump into the flat, punctuation-free word
 * stream Lyrik plays with.
 *
 * Nothing in here is Beatles-specific: give it a blob of text from any source
 * (LRCLIB, a Genius copy-paste, a .lrc file, a plain .txt you typed yourself)
 * and it returns an ordered array of lowercase words with every trace of
 * punctuation, line structure and section labelling removed. That erasure IS
 * the game: the player sees a run of words with no idea where a line began.
 */

/** Whole lines that are structure, not lyric. */
const STRUCTURE_LINE = new RegExp(
  "^\\s*(?:" +
    // [Verse 1], (Chorus), {Bridge: John} — a bracketed label on its own line
    "[\\[({][^\\])}]*[\\])}]" +
    // bare section words, with or without a number/colon
    "|(?:pre-?)?chorus|verse|bridge|intro|outro|refrain|hook|coda|interlude" +
    "|instrumental|solo|guitar\\s+solo|drum\\s+solo|spoken|spoken\\s+word" +
    "|middle\\s+eight|breakdown|vamp|fade\\s*(?:out|in)|ad\\s*libs?" +
    "|repeat(?:\\s+.*)?|end|finis" +
    // Genius scrape furniture
    "|\\d*\\s*contributors?.*|translations?.*|you\\s+might\\s+also\\s+like" +
    "|\\d*\\s*embed|see .* live|get tickets as low as.*" +
    ")\\s*[:\\-–—]?\\s*\\d*\\s*$",
  "i",
);

/** Parentheticals that are stage directions rather than sung words. */
const DIRECTIVE_PAREN = new RegExp(
  "[\\[({]\\s*(?:" +
    "x\\s*\\d+|\\d+\\s*x|repeat(?:\\s+\\w+)*|instrumental|solo|spoken" +
    "|fade\\s*(?:out|in)|ad\\s*libs?|.*\\bsolo\\b.*" +
    ")\\s*[\\])}]",
  "gi",
);

/** A leading .lrc / karaoke timestamp: [00:12.34] or <00:12.34>. */
const TIMESTAMP = /[[<]\s*\d{1,3}:\d{2}(?:[.:]\d{1,3})?\s*[\]>]/g;

/** Curly punctuation and other lookalikes, mapped to plain ASCII. */
const FOLD = new Map(
  Object.entries({
    "‘": "'", "’": "'", "‚": "'", "‛": "'", "ʼ": "'",
    "“": '"', "”": '"', "„": '"', "«": '"', "»": '"',
    "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-",
    "―": "-", "−": "-",
    "…": " ", " ": " ", "​": "", "‌": "", "‍": "",
    "﻿": "",
  }),
);

/** Latin letters (incl. accented), digits, the apostrophe and hyphen survive tokenising. */
const KEEP_IN_WORD = /[^\p{L}\p{N}'-]/gu;

const DEFAULTS = {
  /**
   * Fold "don't" to "dont". The game promises no *sentence* punctuation
   * (commas, full stops, question marks, colons) — apostrophes are part of
   * the word itself, so they stay by default.
   */
  stripApostrophes: false,
  /** Strip accents so "où" matches a plain-keyboard guess. */
  foldAccents: true,
  /** Songs shorter than this are not worth playing. */
  minWords: 40,
  /**
   * Lyric databases carry translated and transliterated takes alongside the
   * original, and a search can land on one. Anything not in Latin script is
   * unplayable here — you type the title on a plain keyboard — so require
   * nearly all of the letters to survive accent-folding as a-z. Spanish,
   * French and German lyrics pass at 1.0; a Japanese or Mongolian take scores
   * near zero.
   */
  minLatin: 0.9,
};

/** Unicode-fold, straighten quotes, kill zero-widths. */
export function foldText(input) {
  let out = "";
  for (const ch of String(input).normalize("NFC")) out += FOLD.get(ch) ?? ch;
  return out;
}

/** Strip diacritics: "Michèle" -> "Michele". */
export function foldAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * What share of the letters are plain a-z once accents are folded — 1 for any
 * language written in the Latin alphabet, ~0 for one that is not. Text with no
 * letters at all counts as 0.
 */
export function latinShare(text) {
  const letters = foldAccents(String(text ?? "")).match(/\p{L}/gu);
  if (!letters || letters.length === 0) return 0;
  let latin = 0;
  for (const ch of letters) if (/[a-zA-Z]/.test(ch)) latin++;
  return latin / letters.length;
}

/**
 * Clean one song.
 *
 * @param {string} raw    the lyric text, however it arrived
 * @param {object} [opts] see DEFAULTS
 * @returns {{words: string[], lines: number, dropped: number, ok: boolean, reason?: string}}
 */
export function cleanLyrics(raw, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const text = foldText(raw ?? "");

  const rawLines = text.split(/\r?\n/);
  let dropped = 0;
  const kept = [];

  for (const line of rawLines) {
    let l = line.replace(TIMESTAMP, " ").trim();
    if (!l) continue;
    if (STRUCTURE_LINE.test(l)) {
      dropped++;
      continue;
    }
    // Bracketed labels mid-line, then stage directions in any bracket style.
    l = l.replace(/\[[^\]]*\]/g, " ").replace(DIRECTIVE_PAREN, " ");
    // Remaining brackets held sung words (backing vocals) — keep the words.
    l = l.replace(/[[\](){}]/g, " ");
    if (!/[\p{L}\p{N}]/u.test(l)) {
      dropped++;
      continue;
    }
    kept.push(l);
  }

  // One stream. Line breaks become plain spaces — the player never learns where
  // a line ended, which is the whole point.
  let flat = kept.join(" ");
  if (o.foldAccents) flat = foldAccents(flat);
  // Slashes and underscores are always separators; a hyphen might instead be
  // holding a compound word ("well-known") together, so it survives into
  // per-token cleanup below rather than being forced apart here.
  flat = flat.toLowerCase().replace(/[/\\_]+/g, " ");

  const words = [];
  for (const token of flat.split(/\s+/)) {
    let w = token.replace(KEEP_IN_WORD, "");
    // Apostrophes and hyphens only ever survive *inside* a word — a lone
    // "-" (a dash used as a pause) or a leading/trailing stray is punctuation,
    // not part of a word, so it's trimmed off the edges rather than kept.
    w = w.replace(/^['-]+|['-]+$/g, "");
    if (o.stripApostrophes) w = w.replace(/'/g, "");
    if (!w || !/[\p{L}\p{N}]/u.test(w)) continue;
    words.push(w);
  }

  if (words.length < o.minWords) {
    return {
      words,
      lines: kept.length,
      dropped,
      ok: false,
      reason: `only ${words.length} words (need ${o.minWords})`,
    };
  }

  const latin = latinShare(words.join(" "));
  if (latin < o.minLatin) {
    return {
      words,
      lines: kept.length,
      dropped,
      ok: false,
      reason: `not Latin script (${Math.round(latin * 100)}% a-z) — probably a translated take`,
    };
  }

  return { words, lines: kept.length, dropped, ok: true };
}

/** Title -> comparison key, so "Ob-La-Di, Ob-La-Da" matches "obladi oblada". */
export function normalizeTitle(title) {
  return foldAccents(foldText(title))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Title -> url-safe id fragment. */
export function slugify(s) {
  return normalizeTitle(s).replace(/\s+/g, "-");
}

export { DEFAULTS };
