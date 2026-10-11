import { describe, expect, it } from "vitest";
import { assembleSearchResult } from "@/lib/domain/search";
import { DEFAULT_SEARCH_FILTERS, type SearchArgs } from "@/lib/schemas";
import { getSchoolsInRadius, searchSchools } from "./index";

const center = { latitude: 38.5816, longitude: -121.4944 };
const base: SearchArgs = {
  center,
  radiusMiles: 3,
  filters: DEFAULT_SEARCH_FILTERS,
  sort: "distance",
  limit: 25,
  offset: 0,
};

const cases: [string, Partial<SearchArgs>][] = [
  ["defaults", {}],
  ["4 miles", { radiusMiles: 4 }],
  ["charter only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["charter"] } }],
  ["private only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["private"] } }],
  ["high school band", { filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["high"] } }],
  ["ELA at least green", { filters: { ...DEFAULT_SEARCH_FILTERS, minElaLevel: "green" } }],
  ["with specialized", { filters: { ...DEFAULT_SEARCH_FILTERS, includeSpecialized: true } }],
  ["under 400 students", { filters: { ...DEFAULT_SEARCH_FILTERS, maxEnrollment: 400 } }],
  ["sorted by ELA", { sort: "ela" }],
  ["sorted by enrollment", { sort: "enrollment" }],
  ["second page", { limit: 10, offset: 10 }],
];

describe("filtering cached radius rows locally", () => {
  it.each(cases)("matches the backend search: %s", async (_name, patch) => {
    const args = { ...base, ...patch };
    const { rows, truncated } = await getSchoolsInRadius({
      center: args.center,
      radiusMiles: args.radiusMiles,
    });
    expect(assembleSearchResult(rows, args, truncated)).toEqual(await searchSchools(args));
  });

  it("returns something to filter", async () => {
    const { rows } = await getSchoolsInRadius({ center, radiusMiles: 3 });
    expect(rows.length).toBeGreaterThan(10);
  });
});
