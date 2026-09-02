import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { CatalogueDef } from "../../catalogues/types";
import type { SongSet } from "../../game/songs";
import { useStats } from "../../game/useStats";
import { liveDailyStreak, playedToday } from "../../game/stats";
import { DAILY_MAX } from "../../game/scoring";
import { puzzleNumber } from "../../lib/rng";
import type { Mode } from "../../game/types";
import { IconCalendar, IconInfinity, IconLeft, IconNote } from "../../icons";
import styles from "./ModeHub.module.css";

interface Props {
  catalogue: CatalogueDef;
  set: SongSet;
}

/**
 * Daily keeps the catalogue's own colour — it is the headline mode and the one
 * worth branding. Endless and Practice take fixed hues instead, so the row is
 * never three shades of one thing and so a mode looks the same whichever
 * artist you are inside.
 */
const MODES: Array<{
  mode: Mode;
  path: string;
  icon: typeof IconCalendar;
  name: string;
  tone: "accent" | "violet" | "sky";
}> = [
  { mode: "daily", path: "daily", icon: IconCalendar, name: "Daily", tone: "accent" },
  { mode: "run", path: "run", icon: IconInfinity, name: "Endless", tone: "violet" },
  { mode: "practice", path: "practice", icon: IconNote, name: "Practice", tone: "sky" },
];

/** Inside a catalogue: its own wording, its own colour, then the three modes. */
export function ModeHub({ catalogue, set }: Props) {
  const { daily, run } = useStats(catalogue.id);
  const streak = liveDailyStreak(daily);
  const done = playedToday(daily);
  const todayNo = puzzleNumber();

  return (
    <main className={styles.hub}>
      <Link to="/" state={{ showHub: true }} className={styles.back}>
        <IconLeft size={12} />
        All catalogues
      </Link>

      <section className={styles.head}>
        <motion.span
          className={styles.art}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <catalogue.Motif className={styles.motif} />
        </motion.span>
        <div className={styles.headText}>
          <h1 className={styles.name}>{catalogue.name}</h1>
          <p className={styles.intro}>{catalogue.copy.intro}</p>
          <span className={styles.count}>{set.songs.length} songs in play</span>
        </div>
      </section>

      <section className={styles.modes} aria-label="Modes">
        {MODES.map((m, i) => {
          const copy = catalogue.copy.modes[m.mode];
          return (
            <motion.div
              key={m.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, type: "spring", stiffness: 300, damping: 28 }}
            >
              <Link
                to={`/${catalogue.id}/${m.path}`}
                className={styles.card}
                data-tone={m.tone}
              >
                <span className={styles.cardIcon}>
                  <m.icon size={22} />
                </span>
                <span className={styles.cardTop}>
                  <span className={styles.cardName}>{m.name}</span>
                  <span className={styles.cardTag}>{copy.tag}</span>
                </span>
                <span className={styles.cardBlurb}>{copy.blurb}</span>
                <span className={styles.cardCta}>
                  {m.mode === "daily" ? (
                    <>
                      {done ? "See today's result" : "Play"}
                      <em>#{todayNo}</em>
                    </>
                  ) : (
                    "Play"
                  )}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </section>

      <section className={styles.strip}>
        <Fact n={daily.played} label="Dailies" />
        <Fact n={streak} label="Streak" tone="gold" />
        <Fact n={daily.maxStreak} label="Best streak" tone="gold" />
        <Fact n={`${daily.bestScore}/${DAILY_MAX}`} label="Best daily" />
        <Fact n={run.bestScore} label="Best run" tone="violet" />
      </section>
    </main>
  );
}

/** A record. `tone` ties the number to whatever it counts — streaks are gold,
    the endless best matches the Endless card. */
function Fact({
  n,
  label,
  tone,
}: {
  n: number | string;
  label: string;
  tone?: "gold" | "violet";
}) {
  return (
    <div className={styles.fact} data-tone={tone}>
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}
