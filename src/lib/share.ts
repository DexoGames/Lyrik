import type { CatalogueDef } from "../catalogues/types";
import type { RoundResult } from "../game/types";
import { DAILY_MAX } from "../game/scoring";

const SITE = "lyrik.dexo.games";

/** Word count → square. Three words is green; six is scraping home. */
const SQUARE: Record<string, string> = {
  "3": "🟩",
  "4": "🟨",
  "5": "🟧",
  "6": "🟥",
  x: "⬛",
};

function cell(r: RoundResult): string {
  if (!r.won) return `${SQUARE.x}—`;
  const n = Math.min(Math.max(r.words, 3), 6);
  return `${SQUARE[String(n)]}${n}`;
}

/** Spoiler-free result: word counts only, never a title or a lyric. */
export function buildDailyShare(
  catalogue: CatalogueDef,
  puzzleNo: number,
  score: number,
  results: RoundResult[],
): string {
  const grid = results.map(cell).join(" ");
  return (
    `Lyrik · ${catalogue.name} #${puzzleNo} - ${score}/${DAILY_MAX}\n` +
    `${grid}\n` +
    `https://${SITE}/${catalogue.id}`
  );
}

export function buildRunShare(
  catalogue: CatalogueDef,
  score: number,
  solved: number,
  bestStreak: number,
): string {
  return (
    `Lyrik · ${catalogue.name} - endless\n` +
    `${solved} song${solved === 1 ? "" : "s"} · ${score} pts · best streak ${bestStreak}\n` +
    `https://${SITE}/${catalogue.id}`
  );
}

/** Native share sheet on mobile, clipboard everywhere else. */
export async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    // Desktop Chrome exposes share() but routes it oddly; prefer the clipboard there.
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (canShare) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — don't fall through to a surprise copy.
      if (err instanceof Error && err.name === "AbortError") return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
