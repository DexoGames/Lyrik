import { describe, expect, it } from "vitest";
import { cleanLyrics, latinShare, normalizeTitle, slugify } from "./lib/clean.mjs";

/** Invented filler — the cleaner is generic, so no real lyric is needed. */
const SAMPLE = `[Verse 1]
Hello there, my friend — it's late
And the "night" is young…

(Chorus)
Won't you stay?
Won't you stay? (x2)

[Bridge: Someone]
Na na na na
Instrumental

Verse 2
So long, farewell, auf Wiedersehen
7 Embed`;

describe("cleanLyrics", () => {
  const { words } = cleanLyrics(SAMPLE, { minWords: 1 });

  it("drops sentence punctuation but keeps apostrophes and hyphens", () => {
    expect(words.join(" ")).not.toMatch(/[^a-z0-9 '-]/);
  });

  it("erases line structure into one stream", () => {
    expect(words.join(" ")).not.toContain("\n");
    expect(words.slice(0, 3)).toEqual(["hello", "there", "my"]);
  });

  it("removes section labels and scrape furniture", () => {
    for (const junk of ["verse", "chorus", "bridge", "instrumental", "embed"]) {
      expect(words).not.toContain(junk);
    }
  });

  it("keeps apostrophes as part of the word", () => {
    expect(words).toContain("it's");
    expect(words).toContain("won't");
  });

  it("keeps sung words that happened to sit in brackets", () => {
    // "(Chorus)" is a label and goes; "na na na na" is sung and stays.
    expect(words.filter((w) => w === "na")).toHaveLength(4);
  });

  it("strips accents so a plain keyboard can match", () => {
    const { words: w } = cleanLyrics("Où es-tu, chérie", { minWords: 1 });
    expect(w).toEqual(["ou", "es-tu", "cherie"]);
  });

  it("keeps hyphenated words joined", () => {
    const { words: w } = cleanLyrics("well-known do-si-do", { minWords: 1 });
    expect(w).toEqual(["well-known", "do-si-do"]);
  });

  it("drops a dash used as standalone punctuation", () => {
    const { words: w } = cleanLyrics("hello - there -- friend", { minWords: 1 });
    expect(w).toEqual(["hello", "there", "friend"]);
  });

  it("strips .lrc timestamps", () => {
    const { words: w } = cleanLyrics("[00:12.34] one two\n[01:02.10] three", { minWords: 1 });
    expect(w).toEqual(["one", "two", "three"]);
  });

  it("rejects a song too short to play", () => {
    const res = cleanLyrics("one two three", { minWords: 40 });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/only 3 words/);
  });

  it("accepts a song of adequate length", () => {
    const res = cleanLyrics(Array.from({ length: 60 }, (_, i) => `w${i}`).join(" "));
    expect(res.ok).toBe(true);
    expect(res.words).toHaveLength(60);
  });

  it("rejects a translated take, and keeps Latin-script languages", () => {
    // A lyric database files translations under the original title; you cannot
    // play a song whose words are not on the keyboard you type guesses with.
    const japanese = cleanLyrics("しっかり ".repeat(40), { minWords: 1 });
    expect(japanese.ok).toBe(false);
    expect(japanese.reason).toMatch(/not Latin script/);

    // Spanish, French and German are Latin script and stay playable.
    const spanish = cleanLyrics("dós oruguítas enamoradas ".repeat(20), { minWords: 1 });
    expect(spanish.ok).toBe(true);
    expect(spanish.words).toContain("dos");
  });

  it("measures how much of a text is plain a-z", () => {
    expect(latinShare("hello there")).toBe(1);
    expect(latinShare("Michèle, ma belle")).toBe(1);
    expect(latinShare("しっかり")).toBe(0);
    expect(latinShare("")).toBe(0);
    expect(latinShare("123 !!!")).toBe(0);
  });

  it("survives empty and junk input", () => {
    expect(cleanLyrics("", { minWords: 1 }).words).toEqual([]);
    expect(cleanLyrics("!!! ??? ---", { minWords: 1 }).words).toEqual([]);
    expect(cleanLyrics(null, { minWords: 1 }).words).toEqual([]);
  });
});

describe("title helpers", () => {
  it("normalises punctuation out of titles", () => {
    expect(normalizeTitle("Ob-La-Di, Ob-La-Da")).toBe("ob la di ob la da");
    expect(normalizeTitle("Sgt. Pepper's!")).toBe("sgt pepper s");
  });

  it("slugifies for filenames", () => {
    expect(slugify("A Day in the Life")).toBe("a-day-in-the-life");
    expect(slugify("Why Don't We Do It in the Road?")).toBe("why-don-t-we-do-it-in-the-road");
  });
});
