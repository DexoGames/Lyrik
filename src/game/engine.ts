import type { SongSet } from "./songs";
import type { Mode, Round, RoundResult, Song } from "./types";
import {
  DAILY_ROUNDS,
  MAX_GUESSES,
  MIN_WORDS,
  RUN_LIVES,
  roundScore,
  toResult,
} from "./scoring";
import {
  canRevealAfter,
  canRevealBefore,
  pickWindow,
  revealAfter,
  revealBefore,
} from "./snippet";
import { puzzleNumber, seededRandom, ymd } from "../lib/rng";

export type Phase = "playing" | "revealed" | "over";

export interface GameState {
  /** Which catalogue is being played — daily seeds and records key off this. */
  catalogueId: string;
  mode: Mode;
  /** UTC day key — daily only, and the guard that a save is still today's. */
  dayKey: string | null;
  puzzleNo: number | null;
  /** Song ids for this session; the daily's five are fixed, a run grows. */
  queue: string[];
  index: number;
  round: Round | null;
  results: RoundResult[];
  score: number;
  /** Endless runs only: wrong guesses and skips both cost one. */
  lives: number;
  streak: number;
  bestStreak: number;
  phase: Phase;
}

export type Action =
  | { type: "reveal"; side: "before" | "after" }
  | { type: "guess"; songId: string }
  | { type: "skip" }
  | { type: "next" }
  | { type: "restart" };

/**
 * Guesses left in the current round. In a run your remaining lives cap it —
 * and since a miss has already docked a life, `lives` is compared against what
 * is *left* of the round's allowance rather than the whole allowance.
 */
export function guessesLeft(state: GameState): number {
  const used = state.round?.guesses.length ?? 0;
  const left = MAX_GUESSES - used;
  return Math.max(0, state.mode === "run" ? Math.min(left, state.lives) : left);
}

function newRound(song: Song, rand: () => number): Round {
  const seed = pickWindow(song, rand);
  return { songId: song.id, seed, snippet: seed, guesses: [], status: "playing", score: 0 };
}

/** Songs long enough that a 6-word window always has somewhere to sit. */
function playable(set: SongSet): Song[] {
  return set.songs.filter((s) => s.words.length >= MIN_WORDS * 3);
}

/**
 * The least-familiar song is still drawn this often relative to the most
 * familiar one — rarities should come up less in endless mode, not almost
 * never.
 */
const RARITY_MIN_WEIGHT = 0.25;

function familiarityWeight(song: Song): number {
  return RARITY_MIN_WEIGHT + (song.familiarity / 100) * (1 - RARITY_MIN_WEIGHT);
}

/** Weighted-random pick, favouring more familiar songs without ruling rarities out. */
function pickWeighted(pool: Song[], rand: () => number): Song {
  const weights = pool.map(familiarityWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function pickRandomId(set: SongSet, exclude: Set<string>, rand: () => number): string {
  const pool = playable(set).filter((s) => !exclude.has(s.id));
  const from = pool.length > 0 ? pool : playable(set);
  return pickWeighted(from, rand).id;
}

/**
 * Daily's five rounds move from the hits to the rarities: a couple of
 * well-known songs to open, a couple of deeper cuts through the middle, and
 * one genuinely niche closer. Tiers are cut by percentile rather than a fixed
 * familiarity threshold, so the curve holds regardless of catalogue size.
 */
function dailyQueue(set: SongSet, rand: () => number): string[] {
  const bySongFamiliarity = [...playable(set)].sort((a, b) => b.familiarity - a.familiarity);
  const n = bySongFamiliarity.length;
  const hitsEnd = Math.min(n, Math.max(1, Math.round(n * 0.4)));
  const deepCutsEnd = Math.min(n, Math.max(hitsEnd + 1, Math.round(n * 0.8)));
  const tiers = [
    bySongFamiliarity.slice(0, hitsEnd),
    bySongFamiliarity.slice(hitsEnd, deepCutsEnd),
    bySongFamiliarity.slice(deepCutsEnd),
  ];
  const tierForRound = (i: number) => {
    if (i < Math.ceil(DAILY_ROUNDS * 0.4)) return tiers[0];
    if (i < Math.ceil(DAILY_ROUNDS * 0.8)) return tiers[1];
    return tiers[2];
  };

  const used = new Set<string>();
  const chosen: string[] = [];
  for (let i = 0; i < DAILY_ROUNDS; i++) {
    const tier = tierForRound(i).filter((s) => !used.has(s.id));
    const from = tier.length > 0 ? tier : bySongFamiliarity.filter((s) => !used.has(s.id));
    const pick = from[Math.floor(rand() * from.length)];
    used.add(pick.id);
    chosen.push(pick.id);
  }
  return chosen;
}

/** Seeds are namespaced by catalogue, so each artist has its own daily. */
const dailySeed = (catalogueId: string, dayKey: string, round?: number) =>
  `lyrik-${catalogueId}-${dayKey}${round === undefined ? "" : `-${round}`}`;

export function startGame(mode: Mode, set: SongSet, now = new Date()): GameState {
  const base: GameState = {
    catalogueId: set.id,
    mode,
    dayKey: null,
    puzzleNo: null,
    queue: [],
    index: 0,
    round: null,
    results: [],
    score: 0,
    lives: mode === "run" ? RUN_LIVES : Infinity,
    streak: 0,
    bestStreak: 0,
    phase: "playing",
  };

  if (mode === "daily") {
    const dayKey = ymd(now);
    const rand = seededRandom(dailySeed(set.id, dayKey));
    const queue = dailyQueue(set, rand);
    const song = set.byId.get(queue[0])!;
    return {
      ...base,
      dayKey,
      puzzleNo: puzzleNumber(now),
      queue,
      round: newRound(song, seededRandom(dailySeed(set.id, dayKey, 0))),
    };
  }

  const id = pickRandomId(set, new Set(), Math.random);
  return { ...base, queue: [id], round: newRound(set.byId.get(id)!, Math.random) };
}

/** Advance to the next song, minting one on demand for endless/practice. */
function withNextRound(state: GameState, set: SongSet): GameState {
  const index = state.index + 1;

  if (state.mode === "daily") {
    if (index >= state.queue.length) return { ...state, phase: "over" };
    const song = set.byId.get(state.queue[index])!;
    return {
      ...state,
      index,
      round: newRound(song, seededRandom(dailySeed(set.id, state.dayKey!, index))),
      phase: "playing",
    };
  }

  if (state.mode === "run" && state.lives <= 0) return { ...state, phase: "over" };

  const id = pickRandomId(set, new Set(state.queue), Math.random);
  return {
    ...state,
    index,
    queue: [...state.queue, id],
    round: newRound(set.byId.get(id)!, Math.random),
    phase: "playing",
  };
}

/** Close the current round out and bank its result. */
function endRound(state: GameState, round: Round): GameState {
  const result = toResult(round);
  const streak = result.won ? state.streak + 1 : 0;
  const over = state.mode === "run" && state.lives <= 0 && !result.won;
  return {
    ...state,
    round,
    results: [...state.results, result],
    score: state.score + result.score,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    phase: over ? "over" : "revealed",
  };
}

export function makeReducer(set: SongSet) {
  return function reducer(state: GameState, action: Action): GameState {
    const round = state.round;

    switch (action.type) {
      case "reveal": {
        if (!round || state.phase !== "playing") return state;
        const song = set.byId.get(round.songId);
        if (!song) return state;
        const can = action.side === "before" ? canRevealBefore : canRevealAfter;
        if (!can(song, round.snippet)) return state;
        const snippet =
          action.side === "before" ? revealBefore(round.snippet) : revealAfter(round.snippet);
        return { ...state, round: { ...round, snippet } };
      }

      case "guess": {
        if (!round || state.phase !== "playing") return state;
        if (round.guesses.includes(action.songId)) return state;

        if (action.songId === round.songId) {
          const score = roundScore(round.snippet.len, round.guesses.length);
          return endRound(state, { ...round, status: "won", score });
        }

        const guesses = [...round.guesses, action.songId];
        const lives = state.mode === "run" ? state.lives - 1 : state.lives;
        const next = { ...state, lives };
        const spent = guesses.length >= MAX_GUESSES || (state.mode === "run" && lives <= 0);
        if (spent) return endRound(next, { ...round, guesses, status: "lost", score: 0 });
        return { ...next, round: { ...round, guesses } };
      }

      case "skip": {
        if (!round || state.phase !== "playing") return state;
        // In a run, walking away from a song costs the same as guessing wrong.
        const lives = state.mode === "run" ? state.lives - 1 : state.lives;
        return endRound({ ...state, lives }, { ...round, status: "lost", score: 0 });
      }

      case "next":
        if (state.phase !== "revealed") return state;
        return withNextRound(state, set);

      case "restart":
        return startGame(state.mode, set);

      default:
        return state;
    }
  };
}

/** Everything the results screen needs, for either mode. */
export function summarise(state: GameState): {
  results: RoundResult[];
  score: number;
  solved: number;
} {
  return {
    results: state.results,
    score: state.score,
    solved: state.results.filter((r) => r.won).length,
  };
}
