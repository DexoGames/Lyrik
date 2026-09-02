import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { searchSongs, type SongOption } from "../../game/songs";
import { cx } from "../../lib/cx";
import styles from "./GuessInput.module.css";

interface Props {
  options: SongOption[];
  /** Song ids already guessed this round — offered but not selectable. */
  guessed: string[];
  guessesLeft: number;
  disabled?: boolean;
  onGuess: (songId: string) => void;
  /** Bump to shake the field — the parent raises this on a wrong guess. */
  shakeKey: number;
  /** Focus on mount and after every round change. */
  autoFocus?: boolean;
}

export function GuessInput({
  options,
  guessed,
  guessesLeft,
  disabled = false,
  onGuess,
  shakeKey,
  autoFocus,
}: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const controls = useAnimationControls();

  const guessedSet = useMemo(() => new Set(guessed), [guessed]);
  const matches = useMemo(() => searchSongs(options, q), [options, q]);

  useEffect(() => {
    if (shakeKey === 0) return;
    setQ("");
    setOpen(false);
    controls.start({
      x: [0, -9, 8, -6, 4, 0],
      transition: { duration: 0.36, ease: "easeInOut" },
    });
  }, [shakeKey, controls]);

  useEffect(() => {
    if (autoFocus && !disabled && window.matchMedia("(hover: hover)").matches) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  const choose = (o: SongOption) => {
    if (guessedSet.has(o.id)) return;
    onGuess(o.id);
    setQ("");
    setOpen(false);
    setHi(0);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const m = matches[hi];
      if (m) choose(m);
    }
  };

  return (
    <motion.div className={styles.wrap} animate={controls}>
      <div className={styles.field}>
        <input
          ref={inputRef}
          className={styles.input}
          value={q}
          disabled={disabled}
          placeholder={disabled ? "Round over" : "Name the song…"}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 130)}
          onKeyDown={onKey}
          aria-label="Name the song"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          name="lyrik-guess"
          type="text"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
        />
        <span
          className={cx(styles.tries, guessesLeft <= 1 && styles.triesLow)}
          title={`${guessesLeft} guess${guessesLeft === 1 ? "" : "es"} left`}
        >
          {guessesLeft}
          <em>left</em>
        </span>
      </div>

      {open && matches.length > 0 && (
        <ul className={styles.list} role="listbox">
          {matches.map((o, i) => {
            const used = guessedSet.has(o.id);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === hi}
                  className={cx(styles.opt, i === hi && styles.optHi, used && styles.optUsed)}
                  onMouseEnter={() => setHi(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  disabled={used}
                >
                  <span className={styles.optTitle}>{o.title}</span>
                  {o.album && <span className={styles.optAlbum}>{o.album}</span>}
                  {used && <span className={styles.optTag}>tried</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
