import { describe, expect, it } from "vitest";
import {
  isBlankSearch,
  parseCompareParams,
  parseMySchoolsParams,
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

describe("search location kind", () => {
  it("round-trips loc for a city or ZIP search and drops anything else", () => {
    expect(parseSearchParams({ address: "Sacramento", loc: "city" }).loc).toBe("city");
    expect(parseSearchParams({ loc: "planet" }).loc).toBeUndefined();
    const out = serializeSearchParams({ address: "95816", loc: "zip", lat: 38.5, lng: -121.4 });
    expect(out.get("loc")).toBe("zip");
    expect(parseCompareParams({ loc: "zip", address: "95816" })).toMatchObject({ loc: "zip" });
  });
});

describe("isBlankSearch", () => {
  const parse = (query: string) => parseSearchParams(new URLSearchParams(query));

  it("is true with nothing typed and no location, whatever else the address carries", () => {
    expect(isBlankSearch(parse(""))).toBe(true);
    expect(isBlankSearch(parse("radius=5&sort=ela"))).toBe(true);
    expect(isBlankSearch(parse("lat=38.5"))).toBe(true);
  });

  it("is false once there is text to search or a place to search around", () => {
    expect(isBlankSearch(parse("address=Sacramento"))).toBe(false);
    expect(isBlankSearch(parse("lat=38.5&lng=-121.4"))).toBe(false);
  });
});

describe("parseMySchoolsParams", () => {
  it("reads the list, without duplicates", () => {
    expect(
      parseMySchoolsParams(
        new URLSearchParams("schools=34674396034292,34674390102038,34674396034292"),
      ).schools,
    ).toEqual(["34674396034292", "34674390102038"]);
  });

  it("is empty when the parameter is missing or holds a bad code", () => {
    expect(parseMySchoolsParams(new URLSearchParams()).schools).toEqual([]);
    expect(parseMySchoolsParams({ schools: "34674396034292,not-a-code" }).schools).toEqual([]);
  });

  it("keeps at most fifty", () => {
    const many = Array.from({ length: 60 }, (_, i) => `34674396${String(i).padStart(6, "0")}`);
    expect(parseMySchoolsParams({ schools: many.join(",") }).schools).toHaveLength(50);
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
