export type Mode = "daily" | "run" | "practice";

export interface Song {
  id: string;
  /** Which catalogue this song belongs to — the first segment of `id`. */
  catalogueId: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  /**
   * Hidden 0-100 score for how widely recognised this song is. Drives the
   * daily's hits-to-rarities curve and the endless mode's draw weighting —
   * never shown to the player.
   */
  familiarity: number;
  /** The whole song as one punctuation-free, line-break-free stream. */
  words: string[];
}

/** The slice of a song currently on screen. */
export interface Snippet {
  /** Index into song.words of the leftmost visible word. */
  start: number;
  /** How many words are visible (3..6). */
  len: number;
}

export type RoundStatus = "playing" | "won" | "lost";

export interface Round {
  songId: string;
  /** The 3-word window the round opened with — never changes. */
  seed: Snippet;
  snippet: Snippet;
  /** Song ids already guessed, in order. */
  guesses: string[];
  status: RoundStatus;
  /** Points banked when the round ended (0 while playing or lost). */
  score: number;
}

/** One finished round, kept for the results screen and the share grid. */
export interface RoundResult {
  songId: string;
  won: boolean;
  words: number;
  wrongGuesses: number;
  score: number;
}
