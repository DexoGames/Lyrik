import type { CatalogueDef } from "./types";
import { DEFAULT_COPY } from "./types";

/**
 * House tabs, open. A scalloped pelmet, two drapes pinched at the tie-backs,
 * and the boards below — the stage opening is the gap between them, so the
 * shape still reads as a curtain at thumbnail size.
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
        {/* pelmet, scalloped along its bottom edge */}
        <path d="M4 7H92V18q-11 12-22 0q-11 12-22 0q-11 12-22 0q-11 12-22 0Z" />
        {/* left drape: wide at the rail, pinched at the tie, flared at the hem */}
        <path d="M6 23H36C34 37 22 41 22 52C22 64 32 71 34 84H6Z" />
        {/* right drape, mirrored */}
        <path d="M90 23H60C62 37 74 41 74 52C74 64 64 71 62 84H90Z" />
        {/* the boards */}
        <path d="M10 87H86V94H10Z" />
      </g>
    </svg>
  );
}

export const MUSICALS: CatalogueDef = {
  id: "musicals",
  name: "Musicals",
  shortName: "Musicals",

  theme: {
    // House-tab red — velvet, not the accent magenta.
    className: "theme-musicals",
    themeColor: "#0d0d0d",
  },

  Motif,

  copy: {
    ...DEFAULT_COPY,
    tagline: " ",
    intro:
      "Guess lyrics from a wide range of musicals. Including Disney hits, broadway classics and more!",

    // You get three curtain calls, and a bad guess burns one.
    life: { one: "curtain call", many: "curtain calls" },
    skip: "Drop the curtain",
    loading: "Taking places…",

    won: ["Bravo", "Showstopper", "Take a bow", "Encore"],
    lost: ["Dried up", "Line!", "Missed your cue"],
    runOver: "Curtain",

    // The ladder runs from the marquee down to the understudy's understudy.
    grades: [
      { min: 0.95, label: "Standing Ovation", blurb: "Not a word out of place." },
      { min: 0.8, label: "Showstopper", blurb: "You barely needed the words." },
      { min: 0.6, label: "Top Billing", blurb: "Solid. A reveal here and there." },
      { min: 0.4, label: "Understudy", blurb: "You got there. Eventually." },
      { min: 0.01, label: "Ensemble", blurb: "Back row, but you were on stage." },
      { min: 0, label: "Dress Rehearsal", blurb: "Tomorrow is another song." },
    ],

    modes: {
      daily: {
        tag: "5 songs",
        blurb: "Five numbers, one performance, no second night.",
      },
      run: {
        tag: "3 curtain calls",
        blurb: "Keep going until the house lights come up.",
      },
      practice: {
        tag: "no stakes",
        blurb: "The rehearsal room. Nobody is taking notes.",
      },
    },

    emptyStats: "Nothing played yet. Go name one.",
  },
};
