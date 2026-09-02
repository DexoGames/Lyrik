import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { SongSet } from "./songs";
import type { Mode, Song } from "./types";
import { load, pruneExcept, save } from "../lib/storage";
import { ymd } from "../lib/rng";
import { recordDaily, recordRun } from "./stats";
import {
  makeReducer,
  startGame,
  summarise,
  type Action,
  type GameState,
} from "./engine";

const dailyKey = (catalogueId: string, day: string) => `daily:${catalogueId}:${day}`;

/** A daily in progress survives a refresh; older saves are swept away. */
function restoreDaily(set: SongSet): GameState {
  const day = ymd();
  const key = dailyKey(set.id, day);
  pruneExcept(`daily:${set.id}:`, [key]);
  const saved = load<GameState | null>(key, null);
  if (
    saved &&
    saved.dayKey === day &&
    saved.catalogueId === set.id &&
    saved.queue.every((id) => set.byId.has(id))
  ) {
    // Infinity does not survive JSON; daily has no lives to restore anyway.
    return { ...saved, lives: Infinity };
  }
  return startGame("daily", set);
}

export interface Game {
  state: GameState;
  song: Song | null;
  dispatch: (a: Action) => void;
  reveal: (side: "before" | "after") => void;
  guess: (songId: string) => void;
  skip: () => void;
  next: () => void;
  restart: () => void;
}

export function useGame(mode: Mode, set: SongSet): Game {
  const reducer = useMemo(() => makeReducer(set), [set]);
  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => (mode === "daily" ? restoreDaily(set) : startGame(mode, set)),
  );

  // Persist an in-progress daily after every move.
  useEffect(() => {
    if (state.mode !== "daily" || !state.dayKey) return;
    save(dailyKey(state.catalogueId, state.dayKey), state);
  }, [state]);

  // Record the finished game exactly once.
  const recorded = useRef(false);
  useEffect(() => {
    if (state.phase !== "over" || recorded.current) return;
    recorded.current = true;
    const { results, score, solved } = summarise(state);
    if (state.mode === "daily" && state.dayKey) {
      recordDaily(state.catalogueId, state.dayKey, score, results);
    } else if (state.mode === "run") {
      recordRun(state.catalogueId, score, solved, state.bestStreak);
    }
  }, [state.phase, state.mode, state.dayKey, state.catalogueId]);

  const song = state.round ? (set.byId.get(state.round.songId) ?? null) : null;

  const reveal = useCallback(
    (side: "before" | "after") => dispatch({ type: "reveal", side }),
    [],
  );
  const guess = useCallback((songId: string) => dispatch({ type: "guess", songId }), []);
  const skip = useCallback(() => dispatch({ type: "skip" }), []);
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const restart = useCallback(() => {
    recorded.current = false;
    dispatch({ type: "restart" });
  }, []);

  return { state, song, dispatch, reveal, guess, skip, next, restart };
}
