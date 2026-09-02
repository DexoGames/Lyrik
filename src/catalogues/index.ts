import { ABBA } from "./abba";
import { BEATLES } from "./beatles";
import { MUSICALS } from "./musicals";
import type { CatalogueDef } from "./types";

/**
 * The catalogue registry.
 *
 * Adding an artist is three steps and no engine changes:
 *   1. data/catalogue/<artist>.json  — the track list, then `npm run songs`
 *   2. src/catalogues/<artist>.tsx   — theme, wording, motif
 *   3. add it to the array below
 *
 * A catalogue with no songs built yet still lists, marked as not ready, so a
 * half-finished addition never breaks the hub.
 */
export const CATALOGUES: readonly CatalogueDef[] = [BEATLES, MUSICALS, ABBA];

export const DEFAULT_CATALOGUE = CATALOGUES[0];

export function findCatalogue(id: string | undefined): CatalogueDef | null {
  if (!id) return null;
  return CATALOGUES.find((c) => c.id === id) ?? null;
}

export type { CatalogueDef, CatalogueCopy, Grade } from "./types";
export { gradeFor, pickLine, DEFAULT_COPY } from "./types";
