import { describe, expect, it } from "vitest";
import { CATALOGUES, findCatalogue } from "./index";
import { DEFAULT_COPY, gradeFor, pickLine } from "./types";

/**
 * Guard rails for adding an artist: these catch the mistakes that would only
 * show up as a blank grade or a missing skin at runtime.
 */
describe("catalogue registry", () => {
  it("has at least one catalogue", () => {
    expect(CATALOGUES.length).toBeGreaterThan(0);
  });

  it("keeps ids unique and url-safe", () => {
    const ids = CATALOGUES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("looks catalogues up by id, and refuses unknown ones", () => {
    expect(findCatalogue(CATALOGUES[0].id)?.name).toBe(CATALOGUES[0].name);
    expect(findCatalogue("nobody")).toBeNull();
    expect(findCatalogue(undefined)).toBeNull();
  });

  it.each(CATALOGUES.map((c) => [c.name, c] as const))("%s is complete", (_name, cat) => {
    expect(cat.theme.className).toMatch(/^theme-[a-z0-9-]+$/);
    expect(cat.copy.tagline.length).toBeGreaterThan(0);
    expect(cat.copy.won.length).toBeGreaterThan(0);
    expect(cat.copy.lost.length).toBeGreaterThan(0);
    for (const mode of ["daily", "run", "practice"] as const) {
      expect(cat.copy.modes[mode].blurb.length).toBeGreaterThan(0);
    }
  });

  it.each(CATALOGUES.map((c) => [c.name, c] as const))(
    "%s grades cover every score",
    (_name, cat) => {
      const mins = cat.copy.grades.map((g) => g.min);
      // Descending, and the last rung must catch a zero.
      expect(mins).toEqual([...mins].sort((a, b) => b - a));
      expect(mins.at(-1)).toBe(0);
      for (const score of [0, 1, 120, 250, 400, 475, 500]) {
        expect(gradeFor(cat.copy, score, 500).label).toBeTruthy();
      }
    },
  );
});

describe("copy helpers", () => {
  it("grades a perfect and an empty score differently", () => {
    const top = gradeFor(DEFAULT_COPY, 500, 500);
    const bottom = gradeFor(DEFAULT_COPY, 0, 500);
    expect(top.label).not.toBe(bottom.label);
  });

  it("survives a zero maximum", () => {
    expect(gradeFor(DEFAULT_COPY, 0, 0).label).toBeTruthy();
  });

  it("picks a stable line for a given seed", () => {
    const lines = ["a", "b", "c"] as const;
    expect(pickLine(lines, 4)).toBe(pickLine(lines, 4));
    expect(pickLine(lines, 4)).toBe("b");
    expect(pickLine(lines, -1)).toBe("b");
  });
});
