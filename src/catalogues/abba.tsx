import type { CatalogueDef } from "./types";
import { DEFAULT_COPY } from "./types";

/**
 * A mirrorball on its cord, faceted lattice cut out of the fill so it reads
 * against any backdrop, with a glint at each shoulder. Disco, not the ABBA
 * logo itself — the logo is trademarked, the glitter is not.
 */
function Motif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 108"
      width={96}
      height={108}
      aria-hidden
      focusable="false"
    >
      <defs>
        <mask id="abba-motif-facets" maskUnits="userSpaceOnUse">
          <rect x="0" y="0" width="96" height="108" fill="white" />
          <g stroke="black" strokeWidth="2" fill="none">
            <ellipse cx="48" cy="58" rx="29" ry="9" />
            <ellipse cx="48" cy="58" rx="29" ry="19" />
            <ellipse cx="48" cy="46" rx="20" ry="6" />
            <ellipse cx="48" cy="70" rx="20" ry="6" />
            <line x1="48" y1="28" x2="48" y2="88" />
            <line x1="23" y1="40" x2="73" y2="76" />
            <line x1="23" y1="76" x2="73" y2="40" />
          </g>
        </mask>
      </defs>
      <g fill="currentColor">
        {/* the cord, hung from a batten out of frame */}
        <rect x="46" y="4" width="4" height="22" />
        {/* the ball, faceted by the mask above */}
        <circle cx="48" cy="58" r="30" mask="url(#abba-motif-facets)" />
        {/* two glints thrown off it */}
        <path d="M14 28l3 7l7 3l-7 3l-3 7l-3-7l-7-3l7-3Z" />
        <path d="M80 64l2 5l5 2l-5 2l-2 5l-2-5l-5-2l5-2Z" />
      </g>
    </svg>
  );
}

export const ABBA: CatalogueDef = {
  id: "abba",
  name: "ABBA",
  shortName: "ABBA",

  theme: {
    // Sweden blue, lit like a mirrorball.
    className: "theme-abba",
    themeColor: "#0d0d0d",
  },

  Motif,

  copy: {
    ...DEFAULT_COPY,
    tagline: " ",
    intro:
      "From a Eurovision-winning Waterloo to the best-selling pop act of the 70s. Two songwriters, four voices, a run of three-minute pop songs that never really left the charts. Can you name the tune from three words?",

    // A bad guess spends a chance, which is all the invitation the title needs.
    life: { one: "chance", many: "chances" },
    skip: "S.O.S.",
    loading: "Needle drop…",

    won: ["Dancing Queen", "Waterloo", "Super Trouper", "Take a Bow"],
    lost: ["Mamma Mia!", "So Long", "Not quite"],
    runOver: "The Winner Takes It All",

    // The ladder runs from the spotlight down to the idiom Waterloo actually
    // means, whatever the song itself sounds like.
    grades: [
      { min: 0.95, label: "Super Trouper", blurb: "Every spotlight found you." },
      { min: 0.8, label: "Dancing Queen", blurb: "You barely needed the words." },
      { min: 0.6, label: "Take a Chance on Me", blurb: "Solid. A reveal here and there." },
      { min: 0.4, label: "Knowing Me, Knowing You", blurb: "You got there. Eventually." },
      { min: 0.01, label: "S.O.S.", blurb: "Distress signal sent." },
      { min: 0, label: "Waterloo", blurb: "Tomorrow is another song." },
    ],

    modes: {
      daily: {
        tag: "5 songs",
        blurb: "The same five for everyone. One go, then a grid to share.",
      },
      run: {
        tag: "3 chances",
        blurb: "Keep dancing until the music stops.",
      },
      practice: {
        tag: "no stakes",
        blurb: "Spin the catalogue with nothing on the scoreboard.",
      },
    },

    emptyStats: "Nothing played yet. Go name one.",
  },
};
