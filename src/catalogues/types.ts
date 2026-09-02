import type { ComponentType } from "react";
import type { Mode } from "../game/types";

/**
 * A CATALOGUE is the top level of the game: one artist's body of released work,
 * with its own look, its own vocabulary and its own records. Modes (daily,
 * endless, practice) sit underneath it.
 *
 * Everything an artist needs to feel like its own game lives in one file under
 * src/catalogues/ — colours, wording, artwork — so adding a second artist never
 * means touching the engine, the screens or the shared components.
 */

export interface CatalogueTheme {
  /** Class put on <html> while this catalogue is open; defined in globals.css. */
  className: string;
  /** Browser chrome colour for this catalogue (PWA / mobile address bar). */
  themeColor: string;
}

/** A rotating line, picked deterministically so it never flickers on re-render. */
export type Lines = readonly [string, ...string[]];

export interface Grade {
  /** Lowest fraction of the maximum score that earns this grade. */
  min: number;
  label: string;
  blurb: string;
}

export interface CatalogueCopy {
  /** One line on the catalogue card. */
  tagline: string;
  /** Two or three lines introducing the catalogue above its modes. */
  intro: string;
  /** What a life is called in endless mode. */
  life: { one: string; many: string };
  /** Verb on the skip button; the cost is appended by the UI. */
  skip: string;
  /** Shown while the song data loads. */
  loading: string;
  /** Headline when a round is won / lost. */
  won: Lines;
  lost: Lines;
  /** Headline over a finished endless run. */
  runOver: string;
  /** Daily grades, best first. The last entry must have min: 0. */
  grades: readonly Grade[];
  modes: Record<Mode, { tag: string; blurb: string }>;
  /** Shown in the stats panel before anything has been played. */
  emptyStats: string;
}

export interface CatalogueDef {
  /** Matches the artist slug in songs.json, and the URL segment. */
  id: string;
  /** Full name, as printed. */
  name: string;
  /** Short name for tight spaces (nav, share text). */
  shortName: string;
  theme: CatalogueTheme;
  copy: CatalogueCopy;
  /** Artwork for the catalogue card. */
  Motif: ComponentType<{ className?: string }>;
}

/**
 * Neutral wording every catalogue starts from. A new artist overrides only the
 * lines worth giving a voice to.
 */
export const DEFAULT_COPY: CatalogueCopy = {
  tagline: "Name the song from three words.",
  intro: "Three words from anywhere in a song. Name it.",
  life: { one: "life", many: "lives" },
  skip: "Give up",
  loading: "Cueing up the tape…",
  won: ["Got it"],
  lost: ["Missed"],
  runOver: "Run over",
  grades: [
    { min: 0.95, label: "Perfect pitch", blurb: "Nothing left on the table." },
    { min: 0.8, label: "In the pocket", blurb: "You barely needed the words." },
    { min: 0.6, label: "Good ear", blurb: "Solid. A reveal here and there." },
    { min: 0.4, label: "Humming along", blurb: "You got there in the end." },
    { min: 0.01, label: "Off key", blurb: "Rough day at the record shop." },
    { min: 0, label: "Tone deaf", blurb: "Tomorrow is another song." },
  ],
  modes: {
    daily: { tag: "5 songs", blurb: "Everyone gets the same five. One go, then a grid to share." },
    run: { tag: "3 lives", blurb: "Keep naming songs until three mistakes end it." },
    practice: { tag: "no stakes", blurb: "Song after song, nothing recorded." },
  },
  emptyStats: "Nothing played yet. Go name one.",
};

/** Pick a line from a rotating set, stably for a given round. */
export function pickLine(lines: Lines, seed: number): string {
  return lines[Math.abs(seed) % lines.length];
}

/** Resolve a score against a catalogue's grade ladder. */
export function gradeFor(copy: CatalogueCopy, score: number, max: number): Grade {
  const pct = max > 0 ? score / max : 0;
  return copy.grades.find((g) => pct >= g.min) ?? copy.grades[copy.grades.length - 1];
}
