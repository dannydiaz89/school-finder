import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pages read school data only through the cached wrappers in `cached.ts`.
 * A page with its own cache, or one that calls the data API directly, is
 * not cleared when an import finishes: the compare page once kept showing a
 * school's old grade span for a day while its own page showed the new one.
 */

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const sources = [...filesUnder("src/app"), ...filesUnder("src/features")].map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

describe("data access boundary", () => {
  it("finds the app and feature sources", () => {
    expect(sources.length).toBeGreaterThan(20);
  });

  it("has no page or feature importing the uncached data API", () => {
    const offenders = sources
      .filter(({ text }) => /from "@\/lib\/data"/.test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it("keeps every cache in cached.ts, where it carries the schools tag", () => {
    const offenders = sources
      .filter(({ text }) => /^\s*"use cache";/m.test(text))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
