import { describe, expect, it } from "vitest";
import {
  parseCompareParams,
  parseSearchParams,
  serializeSearchParams,
  toSearchFilters,
} from "./url-state";

describe("parseSearchParams", () => {
  it("applies defaults to an empty query", () => {
    const p = parseSearchParams(new URLSearchParams());
    expect(p.radius).toBe(3);
    expect(p.types).toEqual(["district", "charter", "private"]);
    expect(p.specialized).toBe(false);
    expect(p.sort).toBe("distance");
    expect(p.page).toBe(1);
  });

  it("parses lists, numbers, and flags", () => {
    const p = parseSearchParams(
      new URLSearchParams(
        "lat=38.58&lng=-121.49&radius=5&types=district,charter&grades=tk,elementary&rating=green&size=500&specialized=1&sort=ela&page=2",
      ),
    );
    expect(p.lat).toBeCloseTo(38.58);
    expect(p.types).toEqual(["district", "charter"]);
    expect(p.grades).toEqual(["tk", "elementary"]);
    expect(p.rating).toBe("green");
    expect(p.size).toBe(500);
    expect(p.specialized).toBe(true);
    expect(p.sort).toBe("ela");
    expect(p.page).toBe(2);
  });

  it("falls back per key on bad values instead of failing", () => {
    const p = parseSearchParams({
      radius: "abc",
      types: "district,bogus",
      sort: "nope",
      lat: "38.5",
    });
    expect(p.radius).toBe(3);
    expect(p.types).toEqual(["district", "charter", "private"]);
    expect(p.sort).toBe("distance");
    expect(p.lat).toBe(38.5);
  });

  it("accepts Next.js searchParams objects with array values", () => {
    const p = parseSearchParams({ radius: ["10", "3"] });
    expect(p.radius).toBe(10);
  });
});

describe("serializeSearchParams", () => {
  it("omits defaults and round-trips the rest", () => {
    const out = serializeSearchParams({
      radius: 3,
      types: ["private", "charter", "district"],
      sort: "distance",
    });
    expect(out.toString()).toBe("");
    const full = serializeSearchParams({
      lat: 38.58,
      lng: -121.49,
      radius: 5,
      grades: ["tk"],
      specialized: true,
    });
    expect(parseSearchParams(full)).toMatchObject({
      lat: 38.58,
      lng: -121.49,
      radius: 5,
      grades: ["tk"],
      specialized: true,
    });
  });
});

describe("toSearchFilters", () => {
  it("maps URL state onto the data-access filter contract", () => {
    const filters = toSearchFilters(
      parseSearchParams(new URLSearchParams("types=private&rating=yellow")),
    );
    expect(filters).toEqual({
      types: ["private"],
      gradeBands: [],
      programs: [],
      affiliations: [],
      minElaLevel: "yellow",
      maxEnrollment: null,
      includeSpecialized: false,
    });
  });
});

describe("parseCompareParams", () => {
  it("caps the list at five and drops the list on a bad code", () => {
    const codes = Array.from({ length: 6 }, (_, i) => `3467439603445${i}`).join(",");
    expect(parseCompareParams({ compare: codes }).compare).toHaveLength(5);
    expect(parseCompareParams({ compare: "nope" }).compare).toEqual([]);
  });
});
