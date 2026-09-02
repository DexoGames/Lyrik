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

/** Latin letters (incl. accented), digits and the apostrophe survive tokenising. */
const KEEP_IN_WORD = /[^\p{L}\p{N}']/gu;

const DEFAULTS = {
  /** Fold "don't" to "dont". The game promises *no* punctuation, so: yes. */
  stripApostrophes: true,
  /** Strip accents so "où" matches a plain-keyboard guess. */
  foldAccents: true,
  /** Songs shorter than this are not worth playing. */
  minWords: 40,
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
  flat = flat.toLowerCase().replace(/[-/\\_]+/g, " ");

  const words = [];
  for (const token of flat.split(/\s+/)) {
    let w = token.replace(KEEP_IN_WORD, "");
    // Apostrophes only ever survive *inside* a word, never at the edges.
    w = w.replace(/^'+|'+$/g, "");
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
