import { describe, expect, it } from "vitest";
import {
  cdsFromParts,
  chunk,
  districtCdsOf,
  isDistrictCds,
  normalizeWebsite,
  schoolYearFromTestYear,
  titleCase,
  usDateToIso,
} from "./common";

describe("usDateToIso", () => {
  it.each([
    ["1/15/2024", "2024-01-15"],
    ["12/3/2019 12:00:00 AM", "2019-12-03"],
    ["", undefined],
    [undefined, undefined],
    ["No Data", undefined],
  ])("%s -> %s", (input, expected) => {
    expect(usDateToIso(input)).toBe(expected);
  });
});

describe("normalizeWebsite", () => {
  it.each([
    ["www.scusd.edu", "https://www.scusd.edu"],
    ["http://example.org/x", "http://example.org/x"],
    ["", undefined],
    ["nodots", undefined],
    ["  ", undefined],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeWebsite(input)).toBe(expected);
  });
});

describe("cds helpers", () => {
  it("pads parts", () => {
    expect(cdsFromParts("34", "67439", "6034458")).toBe("34674396034458");
    expect(cdsFromParts("1", "10017", "112607")).toBe("01100170112607");
  });
  it("derives the district cds", () => {
    expect(districtCdsOf("34674396034458")).toBe("34674390000000");
    expect(isDistrictCds("34674390000000")).toBe(true);
    expect(isDistrictCds("34674396034458")).toBe(false);
  });
});

describe("schoolYearFromTestYear", () => {
  it("formats CDE style", () => {
    expect(schoolYearFromTestYear(2025)).toBe("2024-25");
    expect(schoolYearFromTestYear(2000)).toBe("1999-00");
  });
});

describe("titleCase and chunk", () => {
  it("title-cases words", () => {
    expect(titleCase("SACRAMENTO")).toBe("Sacramento");
    expect(titleCase("rancho cordova")).toBe("Rancho Cordova");
  });
  it("chunks arrays", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
