import type { SVGProps } from "react";

/**
 * Hand-rolled 24×24 icon set — currentColor, 2px strokes, square joins to match
 * the brutalist borders. No icon library: the CSP allows nothing off-origin.
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const IconLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 4L7 12l8 8" />
  </svg>
);

export const IconRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4l8 8-8 8" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

export const IconStats = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const IconHelp = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9a3 3 0 1 1 3 3v2" strokeLinecap="round" />
    <path d="M12 17.5v.01" strokeLinecap="round" strokeWidth="2.5" />
  </svg>
);

export const IconShare = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v13M12 3L7 8M12 3l5 5" />
    <path d="M4 14v6h16v-6" />
  </svg>
);

export const IconHeart = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20S3 14.5 3 8.8A4.8 4.8 0 0 1 12 6.4 4.8 4.8 0 0 1 21 8.8C21 14.5 12 20 12 20z" />
  </svg>
);

export const IconSkip = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5l8 7-8 7zM13 5l8 7-8 7z" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9M20 3v5h-5" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12.5l5.5 5.5L20 6" />
  </svg>
);

export const IconCross = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconNote = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 22c4 0 7-2.7 7-6.5 0-4.5-4-6-4-9.5-3 1-4 3.5-4 5.5C9 9 8 7.5 8 6c-2 2-3 4.5-3 7.2C5 18.3 8 22 12 22z" />
  </svg>
);

export const IconTrophy = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
    <path d="M9 20h6M12 14v6" />
  </svg>
);

export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconInfinity = (p: P) => (
  <svg {...base(p)}>
    <path d="M8.5 12a3.5 3.5 0 1 1 0-.1zM8.5 12c1.5-3 2.5-4.5 4-4.5a4.5 4.5 0 0 1 0 9c-1.5 0-2.5-1.5-4-4.5z" />
  </svg>
);
