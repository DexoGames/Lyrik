import type { CatalogueDef } from "./types";
import { DEFAULT_COPY } from "./types";

/**
 * A plectrum, the shape every one of these bands is holding, with a jagged
 * crack of feedback torn straight through it — the flyer-and-photocopier
 * energy of the scene, not any one band's logo.
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
      <defs>
        <mask id="indie-revival-motif-crack" maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="96" height="96" fill="white" />
          <path d="M55 14L36 50H49L40 86L68 42H53Z" fill="black" />
        </mask>
      </defs>
      <g fill="currentColor">
        {/* the pick, cracked by the mask above */}
        <path
          d="M48 8C70 8 87 27 87 47C87 68 68 89 48 93C28 89 9 68 9 47C9 27 26 8 48 8Z"
          mask="url(#indie-revival-motif-crack)"
        />
      </g>
    </svg>
  );
}

export const INDIE_REVIVAL: CatalogueDef = {
  id: "indie-revival",
  name: "Indie Revival",
  shortName: "Indie",

  theme: {
    // Photocopied-flyer orange, stapled to a lamppost outside the venue.
    className: "theme-indie-revival",
    themeColor: "#0d0d0d",
  },

  Motif,

  copy: {
    ...DEFAULT_COPY,
    tagline: " ",
    intro:
      "Fontaines D.C., Wunderhorse, Inhaler and the rest of the new wave of Irish and UK guitar bands. Joshua Wilcox this is for you pooks x",

    // A bad guess costs a pint, which is what a wasted round out costs.
    life: { one: "pint", many: "pints" },
    skip: "Do one",
    loading: "Feedback building…",

    won: ["Big Shot", "Front row", "Nailed it", "Encore"],
    lost: ["Flat pint", "Missed the pit", "Not this one"],
    runOver: "Last orders",

    // The ladder runs from the headline slot down to an empty room.
    grades: [
      { min: 0.95, label: "Headliner", blurb: "Every word landed!" },
      { min: 0.8, label: "Main Support", blurb: "You barely needed the words!" },
      { min: 0.6, label: "Word of Mouth", blurb: "Solid. A reveal here and there" },
      { min: 0.4, label: "Open Mic", blurb: "You got there, eventually" },
      { min: 0.01, label: "Soundcheck", blurb: "Rough night at the venue" },
      { min: 0, label: "Empty Venue", blurb: "Kinda embarrasing mate" },
    ],

    modes: {
      daily: {
        tag: "5 songs",
        blurb: "Come back every day and compare with friends!",
      },
      run: {
        tag: "3 pints",
        blurb: "A never-ending set.",
      },
      practice: {
        tag: "no stakes",
        blurb: "Tuning up.",
      },
    },

    emptyStats: "Nothing played yet. Go name one.",
  },
};
