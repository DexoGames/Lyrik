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
    tagline: " ",
    intro:
      "From the lovable mop-tops, to the colourful pioneers, to the jaded rockstars. The Beatles are arguably the band with the biggest range in such a short time. Can you identify lyrics from all eras of The Fab Four??",

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
      { min: 0.01, label: "Act Naturally", blurb: "A hard day's night." },
      { min: 0, label: "Misery", blurb: "Tomorrow is another song." },
    ],

    modes: {
      daily: {
        tag: "5 songs",
        blurb: "A different challenge from Yesterday to today.",
      },
      run: {
        tag: "3 takes",
        blurb: "Get to the bottom and go back to the top of the slide.",
      },
      practice: {
        tag: "no stakes",
        blurb: "Hone your craft like the good ol' musty days in Hamburg.",
      },
    },

    emptyStats: "Nothing played yet. Go name one.",
  },
};
