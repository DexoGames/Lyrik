import type { Snippet, Song } from "./types";
import { MAX_WORDS, MIN_WORDS } from "./scoring";

/**
 * Where the window opens.
 *
 * The stream has no line breaks, so a window can straddle two lines, land
 * mid-phrase, or open on a hook. That is the whole trick — but a few windows
 * make for a bad puzzle, so we retry past them:
 *
 *   - windows that simply spell the title (an instant, unearned win)
 *   - windows of one repeated word ("na na na" tells you nothing)
 *   - the very edges of the song, mostly — running out of room on one side is
 *     a rare treat rather than the norm, since it leaks where you are
 */
const ATTEMPTS = 24;

/** Words of the title, normalised the same way the lyric stream is. */
function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function spellsTitle(window: string[], title: string[]): boolean {
  if (title.length === 0) return false;
  const w = window.join(" ");
  const t = title.join(" ");
  return t.includes(w) || w.includes(t);
}

function tooRepetitive(window: string[]): boolean {
  return new Set(window).size < 2;
}

/** Room to grow on both sides, so neither button is dead on arrival. */
function hasHeadroom(start: number, total: number): boolean {
  const grow = MAX_WORDS - MIN_WORDS;
  return start >= grow && start + MIN_WORDS + grow <= total;
}

/**
 * Pick the opening 3-word window for a round.
 * `rand` is injected so the daily puzzle is reproducible.
 */
export function pickWindow(song: Song, rand: () => number): Snippet {
  const total = song.words.length;
  const maxStart = Math.max(0, total - MIN_WORDS);
  const title = titleWords(song.title);

  let fallback: Snippet | null = null;

  for (let i = 0; i < ATTEMPTS; i++) {
    const start = Math.floor(rand() * (maxStart + 1));
    const window = song.words.slice(start, start + MIN_WORDS);
    if (window.length < MIN_WORDS) continue;
    if (tooRepetitive(window) || spellsTitle(window, title)) continue;

    // Anything playable is worth keeping in case every attempt hits an edge.
    fallback ??= { start, len: MIN_WORDS };
    // Prefer interior windows; accept an edge one only late in the search.
    if (hasHeadroom(start, total) || i > ATTEMPTS - 4) return { start, len: MIN_WORDS };
  }

  return fallback ?? { start: 0, len: Math.min(MIN_WORDS, total) };
}

/** `_song` is unused but kept so both guards share one call signature. */
export function canRevealBefore(_song: Song, s: Snippet): boolean {
  return s.len < MAX_WORDS && s.start > 0;
}

export function canRevealAfter(song: Song, s: Snippet): boolean {
  return s.len < MAX_WORDS && s.start + s.len < song.words.length;
}

export function revealBefore(s: Snippet): Snippet {
  return { start: s.start - 1, len: s.len + 1 };
}

export function revealAfter(s: Snippet): Snippet {
  return { start: s.start, len: s.len + 1 };
}

export function snippetWords(song: Song, s: Snippet): string[] {
  return song.words.slice(s.start, s.start + s.len);
}

/** True when the window is flush against the opening/closing word of the song. */
export function atSongStart(s: Snippet): boolean {
  return s.start === 0;
}

export function atSongEnd(song: Song, s: Snippet): boolean {
  return s.start + s.len >= song.words.length;
}
