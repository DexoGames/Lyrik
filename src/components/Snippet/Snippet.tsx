import { AnimatePresence, motion } from "framer-motion";
import type { Round, Song } from "../../game/types";
import { MAX_WORDS } from "../../game/scoring";
import {
  atSongEnd,
  atSongStart,
  canRevealAfter,
  canRevealBefore,
} from "../../game/snippet";
import { cx } from "../../lib/cx";
import { IconLeft, IconRight } from "../../icons";
import styles from "./Snippet.module.css";

interface Props {
  song: Song;
  round: Round;
  /** Reveals are locked once the round is decided. */
  locked: boolean;
  onReveal: (side: "before" | "after") => void;
  /** Points lost by taking one more word — shown on the buttons. */
  revealCost: number;
}

const spring = { type: "spring", stiffness: 500, damping: 34, mass: 0.7 } as const;

export function Snippet({ song, round, locked, onReveal, revealCost }: Props) {
  const { start, len } = round.snippet;
  const words = song.words.slice(start, start + len);
  const seedFrom = round.seed.start;
  const seedTo = round.seed.start + round.seed.len;

  const startEdge = atSongStart(round.snippet);
  const endEdge = atSongEnd(song, round.snippet);
  const beforeOk = !locked && canRevealBefore(song, round.snippet);
  const afterOk = !locked && canRevealAfter(song, round.snippet);
  const maxed = len >= MAX_WORDS;

  return (
    <div className={styles.board}>
      <div className={styles.stage}>
        <RevealButton
          side="before"
          enabled={beforeOk}
          edge={startEdge}
          maxed={maxed}
          cost={revealCost}
          onClick={() => onReveal("before")}
        />

        <div className={styles.tape}>
          <span className={cx(styles.edge, startEdge && styles.edgeStop)} aria-hidden>
            {startEdge ? "⟦" : "…"}
          </span>

          <div className={styles.words}>
            <AnimatePresence initial={false} mode="popLayout">
              {words.map((w, i) => {
                const abs = start + i;
                const isSeed = abs >= seedFrom && abs < seedTo;
                return (
                  <motion.span
                    key={abs}
                    layout
                    className={cx(styles.word, isSeed ? styles.seed : styles.extra)}
                    initial={{ opacity: 0, scale: 0.7, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={spring}
                  >
                    {w}
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>

          <span className={cx(styles.edge, endEdge && styles.edgeStop)} aria-hidden>
            {endEdge ? "⟧" : "…"}
          </span>
        </div>

        <RevealButton
          side="after"
          enabled={afterOk}
          edge={endEdge}
          maxed={maxed}
          cost={revealCost}
          onClick={() => onReveal("after")}
        />
      </div>

      <p className="sr" aria-live="polite">
        {len} words: {words.join(" ")}
      </p>
    </div>
  );
}

function RevealButton({
  side,
  enabled,
  edge,
  maxed,
  cost,
  onClick,
}: {
  side: "before" | "after";
  enabled: boolean;
  edge: boolean;
  maxed: boolean;
  cost: number;
  onClick: () => void;
}) {
  const Icon = side === "before" ? IconLeft : IconRight;
  const label = side === "before" ? "Before" : "After";

  // Two different dead states, and the difference is information: an edge means
  // you are looking at the very first (or last) words of the song.
  const note = edge ? (side === "before" ? "song start" : "song end") : maxed ? "maxed" : `−${cost}`;

  return (
    <button
      className={cx(
        styles.reveal,
        styles[side],
        !enabled && styles.revealOff,
        edge && styles.revealEdge,
      )}
      onClick={onClick}
      disabled={!enabled}
      aria-label={
        edge
          ? `No words ${side} — ${side === "before" ? "start" : "end"} of song`
          : `Reveal one word ${side}, costs ${cost} points`
      }
    >
      <Icon size={18} />
      <span className={styles.revealLabel}>{label}</span>
      <span className={styles.revealNote}>{note}</span>
    </button>
  );
}
