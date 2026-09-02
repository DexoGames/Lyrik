import type { Round, RoundResult } from "./types";

/** A round opens on three words and can grow to six. */
export const MIN_WORDS = 3;
export const MAX_WORDS = 6;
/** Reveals available per round: 6 − 3. */
export const MAX_REVEALS = MAX_WORDS - MIN_WORDS;
/** Wrong guesses allowed before the round is lost. */
export const MAX_GUESSES = 3;

/** Rounds in a daily run. */
export const DAILY_ROUNDS = 5;
/** Lives shared across an endless run. */
export const RUN_LIVES = 3;

/**
 * Base points by how many words were showing when you got it. The drop from
 * three to four is the steepest on purpose: every reveal should hurt.
 */
export const WORD_POINTS: Record<number, number> = { 3: 100, 4: 75, 5: 55, 6: 40 };

/** Multiplier by how many wrong guesses came first. */
export const GUESS_MULTIPLIER = [1, 0.7, 0.45];

export const PERFECT_ROUND = WORD_POINTS[MIN_WORDS];
export const DAILY_MAX = PERFECT_ROUND * DAILY_ROUNDS;

/** Points for solving with `words` showing after `wrongGuesses` misses. */
export function roundScore(words: number, wrongGuesses: number): number {
  const base = WORD_POINTS[Math.min(Math.max(words, MIN_WORDS), MAX_WORDS)] ?? 0;
  const mult = GUESS_MULTIPLIER[Math.min(wrongGuesses, GUESS_MULTIPLIER.length - 1)] ?? 0;
  return Math.round(base * mult);
}

/** What the next correct guess is worth right now — shown live on the board. */
export function pendingScore(round: Round): number {
  return roundScore(round.snippet.len, round.guesses.length);
}

/** What you'd give up by revealing one more word. */
export function revealCost(round: Round): number {
  if (round.snippet.len >= MAX_WORDS) return 0;
  return pendingScore(round) - roundScore(round.snippet.len + 1, round.guesses.length);
}

export function toResult(round: Round): RoundResult {
  return {
    songId: round.songId,
    won: round.status === "won",
    words: round.snippet.len,
    wrongGuesses: round.guesses.length,
    score: round.score,
  };
}

/* Grades live with each catalogue's wording — see src/catalogues/types.ts. */
