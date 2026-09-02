import type { CatalogueDef } from "./types";
import { DEFAULT_COPY } from "./types";

/**
 * The apple — Granny Smith, stem and leaf, no bite taken out of it. The label
 * they signed themselves to, and the one shape that reads as The Beatles at
 * thumbnail size.
 */
function Motif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      width={96}
      height={96}
      aria-hidden
      focusable="false"
    >
      <g fill="currentColor">
        {/* body: a round apple, not an elongated one, with a shallow dip under the stem */}
        <path d="M48 30c-9-8-24-7-32 3-9 11-6 34 5 51 8 12 16 13 27 8 11 5 19 4 27-8 11-17 14-40 5-51-8-10-23-11-32-3z" />
        {/* stem, leaning the way the leaf does not */}
        <path d="M42 30c-2-6 2-12 10-15-2 6-4 9-5 14z" />
        {/* leaf */}
        <path d="M44 25c-6-10-17-12-24-8 4 8 14 11 24 8z" />
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
