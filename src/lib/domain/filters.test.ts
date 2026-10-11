import { describe, expect, it } from "vitest";
import { DEFAULT_SEARCH_FILTERS, type School, type SchoolSummary } from "@/lib/schemas";
import { isSpecializedPlacement, matchesFilters, sortRows } from "./filters";

function school(overrides: Partial<School> = {}): School {
  return {
    cds: "34674396034458" as School["cds"],
    name: "Test Elementary",
    type: "district",
    district: "Sacramento City Unified",
    county: "Sacramento",
    address: { street: "1 Main St", city: "Sacramento", zip: "95814", state: "CA" },
    gradesServed: { low: "K", high: "6" },
    educationalOption: "TRAD",
    instructionLevel: "ELEM",
    ...overrides,
  };
}

function row(overrides: Partial<SchoolSummary> = {}, s: Partial<School> = {}): SchoolSummary {
  return {
    school: school(s),
    distanceMeters: 1000,
    dashboard: { year: 2025, ela: { level: "green", status: 12.4, change: 6.1 } },
    enrollment: 412,
    studentTeacherRatio: 22,
    ...overrides,
  };
}

describe("isSpecializedPlacement", () => {
  it("treats traditional and alternative-of-choice as ordinary", () => {
    expect(isSpecializedPlacement(school({ educationalOption: "TRAD" }))).toBe(false);
    expect(isSpecializedPlacement(school({ educationalOption: "ALTSOC" }))).toBe(false);
  });
  it("flags continuation, juvenile court, community day, special ed, and adult", () => {
    for (const opt of ["CON", "JUV", "COMMDAY", "SPEC"] as const) {
      expect(isSpecializedPlacement(school({ educationalOption: opt }))).toBe(true);
    }
    expect(
      isSpecializedPlacement(school({ instructionLevel: "A", educationalOption: "TRAD" })),
    ).toBe(true);
  });
  it("flags preschool-only programs", () => {
    expect(
      isSpecializedPlacement(school({ instructionLevel: "PS", educationalOption: undefined })),
    ).toBe(true);
  });
  it("flags programs that offer only preschool even when coded as elementary", () => {
    expect(
      isSpecializedPlacement(
        school({ instructionLevel: "ELEM", gradesOffered: { low: "P", high: "P" } }),
      ),
    ).toBe(true);
    expect(
      isSpecializedPlacement(
        school({ instructionLevel: "ELEM", gradesOffered: { low: "P", high: "5" } }),
      ),
    ).toBe(false);
  });
  it("never flags private schools", () => {
    expect(isSpecializedPlacement(school({ type: "private", educationalOption: undefined }))).toBe(
      false,
    );
  });
});

describe("matchesFilters", () => {
  it("passes an ordinary school with default filters", () => {
    expect(matchesFilters(row(), DEFAULT_SEARCH_FILTERS)).toBe(true);
  });
  it("hides specialized placements unless asked", () => {
    const r = row({}, { educationalOption: "CON" });
    expect(matchesFilters(r, DEFAULT_SEARCH_FILTERS)).toBe(false);
    expect(matchesFilters(r, { ...DEFAULT_SEARCH_FILTERS, includeSpecialized: true })).toBe(true);
  });
  it("filters by type", () => {
    expect(matchesFilters(row(), { ...DEFAULT_SEARCH_FILTERS, types: ["charter"] })).toBe(false);
  });
  it("filters by grade band using served grades", () => {
    expect(matchesFilters(row(), { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["high"] })).toBe(false);
    expect(matchesFilters(row(), { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["high", "tk"] })).toBe(
      true,
    );
  });
  it("drops schools without a level when a minimum rating is set", () => {
    const unrated = row({ dashboard: { year: 2025 } });
    expect(matchesFilters(unrated, { ...DEFAULT_SEARCH_FILTERS, minElaLevel: "yellow" })).toBe(
      false,
    );
    expect(matchesFilters(row(), { ...DEFAULT_SEARCH_FILTERS, minElaLevel: "green" })).toBe(true);
    expect(matchesFilters(row(), { ...DEFAULT_SEARCH_FILTERS, minElaLevel: "blue" })).toBe(false);
  });
  it("applies program filters as any-of", () => {
    const magnet = row({}, { magnet: true });
    expect(
      matchesFilters(magnet, { ...DEFAULT_SEARCH_FILTERS, programs: ["multilingual", "magnet"] }),
    ).toBe(true);
    expect(matchesFilters(row(), { ...DEFAULT_SEARCH_FILTERS, programs: ["magnet"] })).toBe(false);
  });
  it("applies affiliation only to private schools", () => {
    const catholic = row(
      {},
      { type: "private", educationalOption: undefined, affiliation: "catholic" },
    );
    const filters = { ...DEFAULT_SEARCH_FILTERS, affiliations: ["nonsectarian" as const] };
    expect(matchesFilters(catholic, filters)).toBe(false);
    expect(matchesFilters(row(), filters)).toBe(true);
  });
});

describe("sortRows", () => {
  const near = row({
    distanceMeters: 500,
    dashboard: { year: 2025, ela: { level: "yellow", status: 0, change: 0 } },
  });
  const far = row({
    distanceMeters: 2000,
    dashboard: { year: 2025, ela: { level: "blue", status: 0, change: 0 } },
  });
  it("sorts by distance ascending", () => {
    expect(sortRows([far, near], "distance")).toEqual([near, far]);
  });
  it("sorts by ELA level descending with distance as tiebreak", () => {
    expect(sortRows([near, far], "ela")).toEqual([far, near]);
  });
  it("does not mutate its input", () => {
    const input = [far, near];
    sortRows(input, "distance");
    expect(input).toEqual([far, near]);
  });
});
