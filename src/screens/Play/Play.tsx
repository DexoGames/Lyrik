import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { CatalogueDef } from "../../catalogues/types";
import type { SongSet } from "../../game/songs";
import type { Mode } from "../../game/types";
import { useGame } from "../../game/useGame";
import { guessesLeft } from "../../game/engine";
import { DAILY_ROUNDS, pendingScore, revealCost } from "../../game/scoring";
import { buzz } from "../../lib/haptics";
import { plural } from "../../lib/plural";
import { Hud } from "../../components/Hud/Hud";
import { Snippet } from "../../components/Snippet/Snippet";
import { GuessInput } from "../../components/GuessInput/GuessInput";
import { RoundReveal } from "../../components/RoundReveal/RoundReveal";
import { GameOver } from "../../components/GameOver/GameOver";
import { Button } from "../../components/Button/Button";
import { IconLeft, IconSkip } from "../../icons";
import styles from "./Play.module.css";

interface Props {
  mode: Mode;
  catalogue: CatalogueDef;
  set: SongSet;
  onStats: () => void;
}

const MODE_TITLE: Record<Mode, string> = {
  daily: "Daily",
  run: "Endless",
  practice: "Practice",
};

export function Play({ mode, catalogue, set, onStats }: Props) {
  const game = useGame(mode, set);
  const { state, song, reveal, guess, skip, next, restart } = game;
  const round = state.round;
  const copy = catalogue.copy;

  // Bumped on every wrong guess to shake the input.
  const [shakeKey, setShakeKey] = useState(0);
  const wrongCount = round?.guesses.length ?? 0;
  const prevWrong = useRef(wrongCount);
  useEffect(() => {
    if (wrongCount > prevWrong.current) {
      setShakeKey((k) => k + 1);
      buzz("bad");
    }
    prevWrong.current = wrongCount;
  }, [wrongCount]);

  const onGuess = useCallback(
    (id: string) => {
      if (round && id === round.songId) buzz("good");
      guess(id);
    },
    [guess, round],
  );

  const onReveal = useCallback(
    (side: "before" | "after") => {
      buzz("tap");
      reveal(side);
    },
    [reveal],
  );

  // Arrow keys reveal, as long as the player isn't mid-word in the guess box.
  useEffect(() => {
    if (state.phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = document.activeElement as HTMLElement | null;
      if (el instanceof HTMLInputElement && el.value.length > 0) return;
      e.preventDefault();
      onReveal(e.key === "ArrowLeft" ? "before" : "after");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, onReveal]);

  const titles = useMemo(
    () => state.queue.map((id) => set.byId.get(id)?.title ?? "…"),
    [state.queue, set],
  );
  const guessTitles = useMemo(
    () => (round ? round.guesses.map((id) => set.byId.get(id)?.title ?? "…") : []),
    [round, set],
  );

  const pending = round ? pendingScore(round) : 0;

  const nextLabel =
    mode === "daily"
      ? state.index + 1 >= DAILY_ROUNDS
        ? "See results"
        : `Next song (${state.index + 2}/${DAILY_ROUNDS})`
      : mode === "run"
        ? state.lives > 0
          ? "Next song"
          : "See how you did"
        : "Another song";

  const skipLabel =
    mode === "run" ? `${copy.skip} (−1 ${copy.life.one})` : copy.skip;

  if (!round || !song) return null;

  return (
    <main className={styles.play}>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <Link to={`/${catalogue.id}`} className={styles.back} aria-label="Back to modes">
            <IconLeft size={12} />
          </Link>
          <span className={styles.mode}>
            {MODE_TITLE[mode]}
            {mode === "daily" && state.puzzleNo ? ` #${state.puzzleNo}` : ""}
          </span>
          <span className={styles.catalogue}>{catalogue.shortName}</span>
        </div>
        {mode === "daily" && state.phase !== "over" && (
          <span className={styles.progress}>
            Song {Math.min(state.index + 1, DAILY_ROUNDS)} of {DAILY_ROUNDS}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state.phase === "over" ? (
          <motion.div
            key="over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameOver
              state={state}
              catalogue={catalogue}
              titles={titles}
              onRestart={restart}
              onStats={onStats}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`round-${state.index}`}
            className={styles.round}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.22 }}
          >
            <Hud state={state} pending={pending} lifeNoun={copy.life} />

            <Snippet
              song={song}
              round={round}
              locked={state.phase !== "playing"}
              onReveal={onReveal}
              revealCost={revealCost(round)}
            />

            <AnimatePresence mode="wait">
              {state.phase === "revealed" ? (
                <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <RoundReveal
                    song={song}
                    round={round}
                    copy={copy}
                    nextLabel={nextLabel}
                    onNext={next}
                    guessTitles={guessTitles}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="guess"
                  className={styles.guessRow}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GuessInput
                    options={set.options}
                    guessed={round.guesses}
                    guessesLeft={guessesLeft(state)}
                    onGuess={onGuess}
                    shakeKey={shakeKey}
                    autoFocus
                  />
                  <Button variant="ghost" onClick={skip} className={styles.skip}>
                    <IconSkip size={13} />
                    {skipLabel}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === "run" && state.phase !== "over" && (
        <p className={styles.livesNote}>
          {state.lives} {plural(state.lives, copy.life)} left
        </p>
      )}
    </main>
  );
}
