import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { CatalogueDef } from "../../catalogues/types";
import { gradeFor } from "../../catalogues/types";
import type { GameState } from "../../game/engine";
import { DAILY_MAX } from "../../game/scoring";
import { bucketOf } from "../../game/stats";
import { buildDailyShare, buildRunShare, shareText } from "../../lib/share";
import { msUntilNextUtcDay } from "../../lib/rng";
import { plural } from "../../lib/plural";
import { cx } from "../../lib/cx";
import { Button } from "../Button/Button";
import { IconRefresh, IconShare, IconStats } from "../../icons";
import styles from "./GameOver.module.css";

interface Props {
  state: GameState;
  catalogue: CatalogueDef;
  /** Round index → song title, for the recap list. */
  titles: string[];
  onRestart: () => void;
  onStats: () => void;
}

export function GameOver({ state, catalogue, titles, onRestart, onStats }: Props) {
  const isDaily = state.mode === "daily";
  const solved = state.results.filter((r) => r.won).length;
  const copy = catalogue.copy;
  const g = gradeFor(copy, state.score, isDaily ? DAILY_MAX : Math.max(state.score, 1));

  const [copied, setCopied] = useState<"idle" | "shared" | "copied" | "failed">("idle");
  const onShare = async () => {
    const text = isDaily
      ? buildDailyShare(catalogue, state.puzzleNo ?? 0, state.score, state.results)
      : buildRunShare(catalogue, state.score, solved, state.bestStreak);
    const res = await shareText(text);
    setCopied(res);
    setTimeout(() => setCopied("idle"), 2000);
  };

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
    >
      <span className={styles.kicker}>
        {catalogue.shortName} · {isDaily ? `Daily #${state.puzzleNo}` : copy.runOver}
      </span>

      <motion.div
        className={styles.score}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
      >
        {state.score}
        {isDaily && <em>/{DAILY_MAX}</em>}
      </motion.div>

      {isDaily ? (
        <p className={styles.grade}>
          <b>{g.label}</b> {g.blurb}
        </p>
      ) : (
        <p className={styles.grade}>
          <b>
            {solved} song{solved === 1 ? "" : "s"} named
          </b>
          best streak {state.bestStreak} · {state.results.length - solved}{" "}
          {plural(state.results.length - solved, copy.life)} spent
        </p>
      )}

      <div className={styles.grid}>
        {state.results.map((r, i) => (
          <motion.div
            key={i}
            className={styles.row}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.16 + i * 0.06 }}
          >
            <span className={styles.chip} data-bucket={bucketOf(r)}>
              {r.won ? r.words : "—"}
            </span>
            <span className={cx(styles.song, !r.won && styles.songMissed)}>
              {titles[i] ?? "…"}
            </span>
            <span className={styles.pts}>{r.won ? `+${r.score}` : "0"}</span>
          </motion.div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={onShare} className={styles.wide}>
          <IconShare size={15} />
          {copied === "copied"
            ? "Copied!"
            : copied === "shared"
              ? "Shared"
              : copied === "failed"
                ? "Copy failed"
                : "Share result"}
        </Button>
        {isDaily ? (
          <Button
            variant="secondary"
            href={`/${catalogue.id}/run`}
            external={false}
            className={styles.wide}
          >
            Play endless
          </Button>
        ) : (
          <Button variant="secondary" onClick={onRestart} className={styles.wide}>
            <IconRefresh size={15} />
            New run
          </Button>
        )}
      </div>

      <button className={styles.statsLink} onClick={onStats}>
        <IconStats size={13} /> See your {catalogue.shortName} record
      </button>

      {isDaily && <NextPuzzleClock />}
      {!isDaily && (
        <Link className={styles.statsLink} to={`/${catalogue.id}/daily`}>
          Today&apos;s daily puzzle →
        </Link>
      )}
    </motion.div>
  );
}

/** Live countdown to the next UTC puzzle drop. */
function NextPuzzleClock() {
  const [ms, setMs] = useState(() => msUntilNextUtcDay());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextUtcDay()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className={styles.clock}>
      Next puzzle in <b>{`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`}</b>
    </p>
  );
}
