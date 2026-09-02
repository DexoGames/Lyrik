import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CATALOGUES } from "../../catalogues";
import type { CatalogueDef } from "../../catalogues/types";
import { readDailyStats, liveDailyStreak, playedToday } from "../../game/stats";
import type { Library } from "../../game/songs";
import { MAX_WORDS, MIN_WORDS } from "../../game/scoring";
import { cx } from "../../lib/cx";
import styles from "./CatalogueHub.module.css";

/** Neutral filler for the hero — never a real lyric. */
const HERO = ["three", "words", "only"];

interface Props {
  library: Library;
  onHelp: () => void;
}

/**
 * The front door. You pick a CATALOGUE — one artist's body of work — and the
 * modes live inside it. With one catalogue this is a short page; it is built to
 * take a shelf full.
 */
export function CatalogueHub({ library, onHelp }: Props) {
  return (
    <main className={styles.hub}>
      <section className={styles.hero}>
        <motion.div
          className={styles.tape}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <span className={styles.tapeEdge}>…</span>
          {HERO.map((w, i) => (
            <motion.span
              key={w}
              className={styles.tapeWord}
              initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: 0.12 + i * 0.09, type: "spring", stiffness: 400, damping: 26 }}
            >
              {w}
            </motion.span>
          ))}
          <span className={styles.tapeEdge}>…</span>
        </motion.div>

        <h1 className={styles.title}>
          Guess the song<span className={styles.dot}>.</span>
        </h1>
        <p className={styles.blurb}>
          {MIN_WORDS} words from anywhere in a song — no punctuation, no line breaks, no idea
          where the line began. Stuck? Take one more from before or after, up to {MAX_WORDS}. The
          fewer you need, the higher you score.
        </p>
        <button className={styles.howto} onClick={onHelp}>
          How it works
        </button>
      </section>

      <h2 className={styles.sectionHead}>
        <span>Pick a catalogue</span>
        <em>{CATALOGUES.length} available</em>
      </h2>

      <section className={styles.shelf}>
        {CATALOGUES.map((cat, i) => (
          <CatalogueCard
            key={cat.id}
            cat={cat}
            songs={library.sets.get(cat.id)?.songs.length ?? 0}
            delay={0.06 * i}
          />
        ))}
        <div className={styles.soon}>
          <span className={styles.soonMark}>+</span>
          <b>More to come</b>
          <span>
            Each catalogue brings its own look, its own wording and its own records.
          </span>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>
          Lyrics fetched at build time from{" "}
          <a href="https://lrclib.net" target="_blank" rel="noopener noreferrer">
            LRCLIB
          </a>
          , never stored here
        </span>
        <a href="https://www.dexo.games" target="_blank" rel="noopener noreferrer">
          Dexo.Games
        </a>
      </footer>
    </main>
  );
}

function CatalogueCard({
  cat,
  songs,
  delay,
}: {
  cat: CatalogueDef;
  songs: number;
  delay: number;
}) {
  const ready = songs > 0;
  const daily = readDailyStats(cat.id);
  const streak = liveDailyStreak(daily);
  const done = playedToday(daily);

  const body = (
    <>
      <span className={styles.cardArt}>
        <cat.Motif className={styles.motif} />
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardTop}>
          <span className={styles.cardName}>{cat.name}</span>
          {ready && <span className={styles.cardCount}>{songs} songs</span>}
        </span>
        <span className={styles.cardTag}>{cat.copy.tagline}</span>
        <span className={styles.cardFoot}>
          {ready ? (
            <>
              <span className={styles.cardCta}>{done ? "Played today" : "Play"}</span>
              {streak > 0 && <em className={styles.cardStreak}>{streak} day streak</em>}
            </>
          ) : (
            <span className={styles.cardPending}>Song data not built</span>
          )}
        </span>
      </span>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 28 }}
    >
      {ready ? (
        <Link to={`/${cat.id}`} className={cx(styles.card, cat.theme.className)}>
          {body}
        </Link>
      ) : (
        <div className={cx(styles.card, styles.cardOff, cat.theme.className)}>{body}</div>
      )}
    </motion.div>
  );
}
