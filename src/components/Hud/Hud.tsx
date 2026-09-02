import { motion } from "framer-motion";
import type { GameState } from "../../game/engine";
import { DAILY_ROUNDS, RUN_LIVES } from "../../game/scoring";
import { bucketOf } from "../../game/stats";
import { plural } from "../../lib/plural";
import { cx } from "../../lib/cx";
import { IconFlame, IconHeart } from "../../icons";
import styles from "./Hud.module.css";

interface Props {
  state: GameState;
  /** Points the current round is worth if you name it right now. */
  pending: number;
  /** What this catalogue calls a life ("life", "take", …). */
  lifeNoun: { one: string; many: string };
}

export function Hud({ state, pending, lifeNoun }: Props) {
  const { mode } = state;

  return (
    <div className={styles.hud}>
      <div className={styles.left}>
        {mode === "daily" && <DailyPips state={state} />}
        {mode === "run" && <Lives lives={state.lives} noun={lifeNoun} />}
        {mode === "practice" && <span className={styles.tag}>Practice</span>}
      </div>

      <div className={styles.right}>
        {mode === "run" && state.streak > 0 && (
          <span className={styles.streak} title="Songs in a row">
            <IconFlame size={13} />
            {state.streak}
          </span>
        )}
        {mode !== "practice" && (
          <span className={styles.total} title="Score so far">
            {state.score}
          </span>
        )}
        <motion.span
          key={pending}
          className={styles.pending}
          initial={{ scale: 1.25, color: "var(--accent)" }}
          animate={{ scale: 1, color: "var(--bone-dim)" }}
          transition={{ duration: 0.32 }}
          title="What this song is worth right now"
        >
          worth {pending}
        </motion.span>
      </div>
    </div>
  );
}

function DailyPips({ state }: { state: GameState }) {
  return (
    <div className={styles.pips} aria-label={`Round ${state.index + 1} of ${DAILY_ROUNDS}`}>
      {Array.from({ length: DAILY_ROUNDS }, (_, i) => {
        const r = state.results[i];
        const bucket = r ? bucketOf(r) : null;
        return (
          <span
            key={i}
            className={cx(
              styles.pip,
              i === state.index && state.phase !== "over" && styles.pipNow,
            )}
            data-bucket={bucket ?? undefined}
            title={r ? (r.won ? `${r.words} words · ${r.score} pts` : "missed") : "to play"}
          />
        );
      })}
    </div>
  );
}

function Lives({ lives, noun }: { lives: number; noun: { one: string; many: string } }) {
  return (
    <div className={styles.lives} aria-label={`${lives} ${plural(lives, noun)} left`}>
      {Array.from({ length: RUN_LIVES }, (_, i) => (
        <motion.span
          key={i}
          className={cx(styles.life, i >= lives && styles.lifeGone)}
          animate={i >= lives ? { scale: [1.3, 1], rotate: [0, -12, 0] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <IconHeart size={15} />
        </motion.span>
      ))}
    </div>
  );
}
