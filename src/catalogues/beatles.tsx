import type { CatalogueDef } from "./types";
import { DEFAULT_COPY } from "./types";

/**
 * Four bars at a slant: the crossing, and — conveniently — one stripe a man.
 */
function Motif({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 72" aria-hidden focusable="false">
      <g fill="currentColor">
        <rect x="6" y="10" width="16" height="52" transform="skewX(-9)" />
        <rect x="34" y="10" width="16" height="52" transform="skewX(-9)" opacity="0.82" />
        <rect x="62" y="10" width="16" height="52" transform="skewX(-9)" opacity="0.64" />
        <rect x="90" y="10" width="16" height="52" transform="skewX(-9)" opacity="0.46" />
      </g>
    </svg>
  );
}

export const BEATLES: CatalogueDef = {
  id: "the-beatles",
  name: "The Beatles",
  shortName: "Beatles",

  theme: {
    // Granny Smith apple green.
    className: "theme-beatles",
    themeColor: "#0d0d0d",
  },

  Motif,

  copy: {
    ...DEFAULT_COPY,
    tagline: "Four lads. Two hundred-odd songs. Three words.",
    intro:
      "The thirteen studio albums, Magical Mystery Tour, the singles and B-sides, " +
      "and the three that arrived decades late. Every one of them properly released — " +
      "and every one of them fair game.",

    // A bad guess costs you a take, which is what it would have cost them.
    life: { one: "take", many: "takes" },
    skip: "Let it be",
    loading: "Counting in…",

    won: ["Fab", "Toppermost", "Got it", "Spot on"],
    lost: ["Missed", "Not this one", "Another take"],
    runOver: "The end",

    // Grades borrow their names from the records. The ladder still reads as a
    // ladder if you have never heard of any of them.
    grades: [
      { min: 0.95, label: "Toppermost", blurb: "The toppermost of the poppermost." },
      { min: 0.8, label: "Fab", blurb: "You barely needed the words." },
      { min: 0.6, label: "Getting Better", blurb: "Solid. A reveal here and there." },
      { min: 0.4, label: "Help!", blurb: "You got there. Eventually." },
      { min: 0.01, label: "Act Naturally", blurb: "Rough day at the record shop." },
      { min: 0, label: "Misery", blurb: "Tomorrow is another song." },
    ],

    modes: {
      daily: {
        tag: "5 songs",
        blurb: "The same five for everybody, once a day. One go, then a grid worth sharing.",
      },
      run: {
        tag: "3 takes",
        blurb: "Keep naming them. Three bad takes and the session is over.",
      },
      practice: {
        tag: "no stakes",
        blurb: "Song after song, nothing recorded. Good for learning the deep cuts.",
      },
    },

    emptyStats: "Nothing played yet. Go name one.",
  },
};
