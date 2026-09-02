import { load, save } from "../lib/storage";
import { previousYmd, ymd } from "../lib/rng";
import type { RoundResult } from "./types";

/** Histogram buckets: how many words it took, or "x" for a round not solved. */
export type Bucket = "3" | "4" | "5" | "6" | "x";
export const BUCKETS: Bucket[] = ["3", "4", "5", "6", "x"];

export function bucketOf(r: RoundResult): Bucket {
  if (!r.won) return "x";
  return String(Math.min(Math.max(r.words, 3), 6)) as Bucket;
}

export interface DailyStats {
  /** dailies finished */
  played: number;
  currentStreak: number;
  maxStreak: number;
  bestScore: number;
  totalScore: number;
  /** rounds solved across all dailies */
  solved: number;
  rounds: number;
  lastYmd: string | null;
  dist: Record<Bucket, number>;
}

export interface RunStats {
  runs: number;
  bestScore: number;
  bestStreak: number;
  totalSolved: number;
}

const EMPTY_DAILY: DailyStats = {
  played: 0,
  currentStreak: 0,
  maxStreak: 0,
  bestScore: 0,
  totalScore: 0,
  solved: 0,
  rounds: 0,
  lastYmd: null,
  dist: { "3": 0, "4": 0, "5": 0, "6": 0, x: 0 },
};

const EMPTY_RUN: RunStats = { runs: 0, bestScore: 0, bestStreak: 0, totalSolved: 0 };

// Records are per catalogue: a Beatles streak has nothing to say about anyone else's.
const dailyKey = (catalogueId: string) => `stats:daily:${catalogueId}`;
const runKey = (catalogueId: string) => `stats:run:${catalogueId}`;

export function readDailyStats(catalogueId: string): DailyStats {
  const s = load<DailyStats>(dailyKey(catalogueId), EMPTY_DAILY);
  // Tolerate a stats blob written by an older build.
  return { ...EMPTY_DAILY, ...s, dist: { ...EMPTY_DAILY.dist, ...s.dist } };
}

export function readRunStats(catalogueId: string): RunStats {
  return { ...EMPTY_RUN, ...load<RunStats>(runKey(catalogueId), EMPTY_RUN) };
}

/** Record a finished daily. Idempotent per day: replaying today won't double-count. */
export function recordDaily(
  catalogueId: string,
  dayKey: string,
  score: number,
  results: RoundResult[],
): DailyStats {
  const s = readDailyStats(catalogueId);
  if (s.lastYmd === dayKey) return s;

  s.played += 1;
  s.currentStreak = s.lastYmd === previousYmd(dayKey) ? s.currentStreak + 1 : 1;
  s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
  s.bestScore = Math.max(s.bestScore, score);
  s.totalScore += score;
  s.rounds += results.length;
  s.solved += results.filter((r) => r.won).length;
  for (const r of results) s.dist[bucketOf(r)] += 1;
  s.lastYmd = dayKey;

  save(dailyKey(catalogueId), s);
  emit();
  return s;
}

/** A daily streak survives only while today's or yesterday's puzzle is the last one played. */
export function liveDailyStreak(s: DailyStats, today = ymd()): number {
  if (!s.lastYmd) return 0;
  if (s.lastYmd === today || s.lastYmd === previousYmd(today)) return s.currentStreak;
  return 0;
}

/** True once today's daily for this catalogue has been finished. */
export function playedToday(s: DailyStats, today = ymd()): boolean {
  return s.lastYmd === today;
}

export function recordRun(
  catalogueId: string,
  score: number,
  solved: number,
  bestStreak: number,
): RunStats {
  const s = readRunStats(catalogueId);
  s.runs += 1;
  s.bestScore = Math.max(s.bestScore, score);
  s.bestStreak = Math.max(s.bestStreak, bestStreak);
  s.totalSolved += solved;
  save(runKey(catalogueId), s);
  emit();
  return s;
}

const LAST_CATALOGUE_KEY = "last-catalogue";

/** Remembers the last catalogue actually visited, so a return trip can skip the shelf. */
export function readLastCatalogue(): string | null {
  return load<string | null>(LAST_CATALOGUE_KEY, null);
}

export function recordLastCatalogue(catalogueId: string): void {
  save(LAST_CATALOGUE_KEY, catalogueId);
}

// --- tiny pub/sub so the stats modal stays live without prop drilling ---
const listeners = new Set<() => void>();

export function subscribeStats(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  listeners.forEach((fn) => fn());
}
