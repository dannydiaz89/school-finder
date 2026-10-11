import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_FILTERS,
  type School,
  type SchoolSummary,
  type SearchArgs,
} from "@/lib/schemas";
import { assembleSearchResult } from "./search";

function row(
  cds: string,
  distanceMeters: number,
  overrides: Partial<School> = {},
  enrollment = 400,
): SchoolSummary {
  return {
    school: {
      cds: cds as School["cds"],
      name: cds,
      type: "district",
      district: "D",
      county: "Sacramento",
      address: { street: "1 St", city: "Sacramento", zip: "95814", state: "CA" },
      gradesServed: { low: "K", high: "6" },
      educationalOption: "TRAD",
      coordinates: { latitude: 38.5, longitude: -121.5 },
      ...overrides,
    },
    distanceMeters,
    dashboard: { year: 2025 },
    enrollment,
    studentTeacherRatio: null,
  };
}

const args: SearchArgs = {
  center: { latitude: 38.5, longitude: -121.5 },
  radiusMiles: 3,
  filters: DEFAULT_SEARCH_FILTERS,
  sort: "distance",
  limit: 2,
  offset: 0,
};

const rows = [
  row("1", 300),
  row("2", 100, { type: "charter" }),
  row("3", 200, { type: "private", educationalOption: undefined }),
  row("4", 50, { educationalOption: "CON" }),
];

describe("assembleSearchResult", () => {
  it("hides placements, counts by type, sorts and pages", () => {
    const out = assembleSearchResult(rows, args);
    expect(out.schools.map((r) => r.school.cds)).toEqual(["2", "3"]);
    expect(out.total).toBe(3);
    expect(out.countsByType).toEqual({ district: 1, charter: 1, private: 1 });
    expect(out.hiddenSpecialized).toBe(1);
  });

  it("includes placements when asked and counts them by type", () => {
    const out = assembleSearchResult(rows, {
      ...args,
      filters: { ...DEFAULT_SEARCH_FILTERS, includeSpecialized: true },
      limit: 10,
    });
    expect(out.schools.map((r) => r.school.cds)).toEqual(["4", "2", "3", "1"]);
    expect(out.countsByType).toEqual({ district: 2, charter: 1, private: 1 });
    expect(out.hiddenSpecialized).toBe(0);
  });

  it("counts by type before the type filter", () => {
    const out = assembleSearchResult(rows, {
      ...args,
      filters: { ...DEFAULT_SEARCH_FILTERS, types: ["private"] },
    });
    expect(out.total).toBe(1);
    expect(out.countsByType).toEqual({ district: 1, charter: 1, private: 1 });
  });

  it("applies the offset", () => {
    const out = assembleSearchResult(rows, { ...args, offset: 2, limit: 5 });
    expect(out.schools.map((r) => r.school.cds)).toEqual(["1"]);
  });
});
