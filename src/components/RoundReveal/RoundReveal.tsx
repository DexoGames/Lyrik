import { motion } from "framer-motion";
import type { CatalogueCopy } from "../../catalogues/types";
import { pickLine } from "../../catalogues/types";
import type { Round, Song } from "../../game/types";
import { MIN_WORDS } from "../../game/scoring";
import { cx } from "../../lib/cx";
import { Button } from "../Button/Button";
import { IconCheck, IconCross } from "../../icons";
import styles from "./RoundReveal.module.css";

interface Props {
  song: Song;
  round: Round;
  copy: CatalogueCopy;
  /** Label for the continue button — "Next song", "See results", … */
  nextLabel: string;
  onNext: () => void;
  /** Wrong guesses, resolved to titles for the miss list. */
  guessTitles: string[];
}

export function RoundReveal({ song, round, copy, nextLabel, onNext, guessTitles }: Props) {
  const won = round.status === "won";
  const extra = round.snippet.len - MIN_WORDS;
  // Keyed off the window so the line is stable for the life of the round.
  const headline = pickLine(won ? copy.won : copy.lost, round.seed.start);

  return (
    <motion.div
      className={cx(styles.card, won ? styles.won : styles.lost)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <div className={styles.head}>
        <span className={styles.mark}>{won ? <IconCheck size={18} /> : <IconCross size={18} />}</span>
        <span className={styles.headline}>{headline}</span>
        {won && (
          <motion.span
            className={styles.score}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 500, damping: 22 }}
          >
            +{round.score}
          </motion.span>
        )}
      </div>

      <h3 className={styles.title}>{song.title}</h3>
      <p className={styles.meta}>
        {song.album ?? song.artist}
        {song.year ? ` · ${song.year}` : ""}
      </p>

      <div className={styles.facts}>
        <span>
          <b>{round.snippet.len}</b> words
          {extra > 0 ? ` (${extra} revealed)` : " — no reveals"}
        </span>
        <span>
          <b>{round.guesses.length}</b> wrong
        </span>
        <span className={styles.where}>
          from word <b>{round.seed.start + 1}</b> of {song.words.length}
        </span>
      </div>

      {guessTitles.length > 0 && (
        <ul className={styles.misses}>
          {guessTitles.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      <Button variant="primary" size="lg" className={styles.next} onClick={onNext}>
        {nextLabel}
      </Button>
    </motion.div>
  );
}
