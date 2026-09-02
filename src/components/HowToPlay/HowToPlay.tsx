import type { CatalogueDef } from "../../catalogues/types";
import { DEFAULT_COPY } from "../../catalogues/types";
import { MAX_GUESSES, MAX_WORDS, MIN_WORDS, WORD_POINTS } from "../../game/scoring";
import { Modal } from "../Modal/Modal";
import styles from "./HowToPlay.module.css";

/** Neutral filler for the diagram — never a real lyric. */
const DEMO = ["word", "word", "word"];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Null on the catalogue picker; then the wording falls back to neutral. */
  catalogue: CatalogueDef | null;
}

export function HowToPlay({ open, onClose, catalogue }: Props) {
  const copy = catalogue?.copy ?? DEFAULT_COPY;
  const modes = copy.modes;

  return (
    <Modal title="How to play" open={open} onClose={onClose}>
      <p className={styles.lead}>
        You get <b>{MIN_WORDS} words</b> from somewhere in a song — no punctuation, no line
        breaks, no telling where a line started. Name the song.
      </p>

      <div className={styles.demo}>
        <span className={styles.demoEdge}>…</span>
        {DEMO.map((w, i) => (
          <span key={i} className={styles.demoWord}>
            {w}
          </span>
        ))}
        <span className={styles.demoEdge}>…</span>
      </div>
      <p className={styles.caption}>
        The window can open mid-line or straddle two — that is the point.
      </p>

      <h3 className={styles.h}>Stuck?</h3>
      <p className={styles.p}>
        Take another word from <b>before</b> or <b>after</b> the run you can see. Take one
        before, and the next &ldquo;before&rdquo; pulls the word before <em>that</em>. You can
        grow to <b>{MAX_WORDS} words</b> — no further.
      </p>

      <h3 className={styles.h}>Scoring</h3>
      <div className={styles.table}>
        {Object.entries(WORD_POINTS).map(([words, pts]) => (
          <div key={words} className={styles.tRow}>
            <span className={styles.tKey} data-bucket={words}>
              {words} words
            </span>
            <span className={styles.tVal}>{pts} pts</span>
          </div>
        ))}
      </div>
      <p className={styles.p}>
        Every reveal costs you. So does a miss: your second guess scores 70%, your third 45%,
        and after <b>{MAX_GUESSES}</b> wrong the song is gone.
      </p>

      <h3 className={styles.h}>Catalogues &amp; modes</h3>
      <p className={styles.p}>
        A <b>catalogue</b> is one artist&apos;s body of work — its own songs, its own look, its
        own records. Inside one you pick a mode:
      </p>
      <ul className={styles.modes}>
        <li>
          <b>Daily</b> — {modes.daily.blurb}
        </li>
        <li>
          <b>Endless</b> — {modes.run.blurb}
        </li>
        <li>
          <b>Practice</b> — {modes.practice.blurb}
        </li>
      </ul>

      <p className={styles.note}>
        Tip: on a keyboard, <kbd>←</kbd> and <kbd>→</kbd> reveal words, <kbd>Enter</kbd> guesses.
      </p>
    </Modal>
  );
}
