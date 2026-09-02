import { describe, expect, it } from "vitest";
import type { SongSet } from "./songs";
import type { Song } from "./types";
import { guessesLeft, makeReducer, startGame } from "./engine";
import {
  DAILY_ROUNDS,
  MAX_GUESSES,
  MAX_WORDS,
  MIN_WORDS,
  RUN_LIVES,
  roundScore,
} from "./scoring";
import { pickWindow, canRevealAfter, canRevealBefore } from "./snippet";

/** Synthetic songs: word_0 … word_n, so no real lyric is needed to test. */
function makeSong(i: number, length = 120, familiarity = 50): Song {
  return {
    id: `test/song-${i}`,
    catalogueId: "test",
    title: `Song ${i}`,
    artist: "Test",
    album: "Album",
    year: 1970,
    familiarity,
    words: Array.from({ length }, (_, w) => `s${i}w${w}`),
  };
}

/** Familiarity spread evenly 0..100 across the set, by index. */
function makeSet(count = 12): SongSet {
  const songs = Array.from({ length: count }, (_, i) =>
    makeSong(i, 120, Math.round((i / (count - 1)) * 100)),
  );
  return {
    id: "test",
    songs,
    byId: new Map(songs.map((s) => [s.id, s])),
    options: songs.map((s) => ({
      id: s.id,
      title: s.title,
      album: s.album,
      year: s.year,
      search: s.title.toLowerCase(),
    })),
  };
}

const lib = makeSet();
const reduce = makeReducer(lib);

describe("scoring", () => {
  it("pays most for three words on the first guess", () => {
    expect(roundScore(MIN_WORDS, 0)).toBe(100);
  });

  it("falls off with every extra word", () => {
    const ladder = [3, 4, 5, 6].map((n) => roundScore(n, 0));
    expect(ladder).toEqual([...ladder].sort((a, b) => b - a));
    expect(new Set(ladder).size).toBe(4);
  });

  it("discounts for wrong guesses", () => {
    expect(roundScore(3, 1)).toBeLessThan(roundScore(3, 0));
    expect(roundScore(3, 2)).toBeLessThan(roundScore(3, 1));
  });
});

describe("snippet windows", () => {
  it("always opens on exactly three words", () => {
    for (let i = 0; i < 200; i++) {
      const w = pickWindow(lib.songs[i % lib.songs.length], Math.random);
      expect(w.len).toBe(MIN_WORDS);
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.start + w.len).toBeLessThanOrEqual(120);
    }
  });

  it("never runs off either end of the song", () => {
    const song = makeSong(99, 10);
    for (let i = 0; i < 100; i++) {
      const w = pickWindow(song, Math.random);
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.start + w.len).toBeLessThanOrEqual(song.words.length);
    }
  });

  it("closes the reveal buttons at the edges", () => {
    const song = makeSong(1, 6);
    expect(canRevealBefore(song, { start: 0, len: 3 })).toBe(false);
    expect(canRevealAfter(song, { start: 3, len: 3 })).toBe(false);
    expect(canRevealBefore(song, { start: 1, len: 3 })).toBe(true);
  });
});

describe("round flow", () => {
  it("grows to six words and stops", () => {
    let state = startGame("practice", lib);
    for (let i = 0; i < 10; i++) {
      state = reduce(state, { type: "reveal", side: i % 2 ? "before" : "after" });
    }
    expect(state.round!.snippet.len).toBeLessThanOrEqual(MAX_WORDS);
    expect(state.round!.snippet.len).toBe(MAX_WORDS);
  });

  it("scores a first-guess win at full value", () => {
    let state = startGame("practice", lib);
    state = reduce(state, { type: "guess", songId: state.round!.songId });
    expect(state.round!.status).toBe("won");
    expect(state.score).toBe(100);
    expect(state.phase).toBe("revealed");
  });

  it("pays less once words have been revealed", () => {
    let state = startGame("practice", lib);
    state = reduce(state, { type: "reveal", side: "after" });
    state = reduce(state, { type: "guess", songId: state.round!.songId });
    expect(state.score).toBe(roundScore(4, 0));
  });

  it("loses the round after three wrong guesses", () => {
    let state = startGame("practice", lib);
    const wrong = lib.songs.filter((s) => s.id !== state.round!.songId).slice(0, MAX_GUESSES);
    for (const s of wrong) state = reduce(state, { type: "guess", songId: s.id });
    expect(state.round!.status).toBe("lost");
    expect(state.score).toBe(0);
    expect(state.results).toHaveLength(1);
  });

  it("ignores a repeated guess", () => {
    let state = startGame("practice", lib);
    const wrong = lib.songs.find((s) => s.id !== state.round!.songId)!;
    state = reduce(state, { type: "guess", songId: wrong.id });
    const after = reduce(state, { type: "guess", songId: wrong.id });
    expect(after.round!.guesses).toHaveLength(1);
  });
});

describe("daily", () => {
  it("is identical for the same day and different across days", () => {
    const a = startGame("daily", lib, new Date("2026-09-02T10:00:00Z"));
    const b = startGame("daily", lib, new Date("2026-09-02T23:00:00Z"));
    const c = startGame("daily", lib, new Date("2026-09-03T10:00:00Z"));
    expect(a.queue).toEqual(b.queue);
    expect(a.round!.seed).toEqual(b.round!.seed);
    expect(a.queue).not.toEqual(c.queue);
  });

  it("runs five distinct songs then ends", () => {
    let state = startGame("daily", lib, new Date("2026-09-02T10:00:00Z"));
    expect(state.queue).toHaveLength(DAILY_ROUNDS);
    expect(new Set(state.queue).size).toBe(DAILY_ROUNDS);

    for (let i = 0; i < DAILY_ROUNDS; i++) {
      state = reduce(state, { type: "guess", songId: state.round!.songId });
      state = reduce(state, { type: "next" });
    }
    expect(state.phase).toBe("over");
    expect(state.results).toHaveLength(DAILY_ROUNDS);
    expect(state.score).toBe(100 * DAILY_ROUNDS);
  });

  it("moves from the most familiar songs to the least across its five rounds", () => {
    // lib's 12 songs have familiarity spread evenly 0..100 by index.
    const state = startGame("daily", lib, new Date("2026-09-02T10:00:00Z"));
    const familiarities = state.queue.map((id) => lib.byId.get(id)!.familiarity);
    const [r0, r1, r2, r3, r4] = familiarities;
    expect(Math.min(r0, r1)).toBeGreaterThan(Math.max(r2, r3));
    expect(Math.max(r2, r3)).toBeGreaterThan(r4);
  });
});

describe("endless run", () => {
  it("spends a life per wrong guess and ends at zero", () => {
    let state = startGame("run", lib);
    expect(state.lives).toBe(RUN_LIVES);

    for (let i = 0; i < RUN_LIVES; i++) {
      const wrong = lib.songs.find(
        (s) => s.id !== state.round!.songId && !state.round!.guesses.includes(s.id),
      )!;
      state = reduce(state, { type: "guess", songId: wrong.id });
    }
    expect(state.lives).toBe(0);
    expect(state.phase).toBe("over");
  });

  it("caps guesses by lives remaining", () => {
    let state = startGame("run", lib);
    expect(guessesLeft(state)).toBe(Math.min(MAX_GUESSES, RUN_LIVES));

    // One miss: a life gone, and one of the round's three tries gone with it.
    const wrong = lib.songs.find((s) => s.id !== state.round!.songId)!;
    state = reduce(state, { type: "guess", songId: wrong.id });
    expect(state.lives).toBe(RUN_LIVES - 1);
    expect(guessesLeft(state)).toBe(2);
  });

  it("leaves exactly one guess when down to the last life", () => {
    let state = startGame("run", lib);
    state = reduce(state, { type: "skip" });
    state = reduce(state, { type: "next" });
    state = reduce(state, { type: "skip" });
    state = reduce(state, { type: "next" });
    expect(state.lives).toBe(1);
    expect(guessesLeft(state)).toBe(1);
  });

  it("charges a life for skipping", () => {
    let state = startGame("run", lib);
    state = reduce(state, { type: "skip" });
    expect(state.lives).toBe(RUN_LIVES - 1);
    expect(state.results[0].won).toBe(false);
  });

  it("keeps serving new songs while lives hold out", () => {
    let state = startGame("run", lib);
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: "guess", songId: state.round!.songId });
      state = reduce(state, { type: "next" });
    }
    expect(state.phase).toBe("playing");
    expect(state.streak).toBe(5);
    expect(new Set(state.queue).size).toBe(state.queue.length);
  });

  it("draws the most familiar song more often than the least familiar one", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 3000; i++) {
      const state = startGame("run", lib);
      const id = state.round!.songId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const mostFamiliar = lib.songs.reduce((a, b) => (b.familiarity > a.familiarity ? b : a));
    const leastFamiliar = lib.songs.reduce((a, b) => (b.familiarity < a.familiarity ? b : a));
    expect(counts.get(mostFamiliar.id) ?? 0).toBeGreaterThan(counts.get(leastFamiliar.id) ?? 0);
  });
});
