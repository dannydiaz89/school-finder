import { describe, expect, it } from "vitest";
import { COUNTY_CODES, countyCode } from "./counties";

describe("countyCode", () => {
  it("has the 58 counties", () => {
    expect(Object.keys(COUNTY_CODES)).toHaveLength(58);
    expect(COUNTY_CODES["01"]).toBe("Alameda");
    expect(COUNTY_CODES["58"]).toBe("Yuba");
  });
  it.each([
    ["Sacramento", "34"],
    ["sacramento", "34"],
    ["34", "34"],
    ["7", "07"],
    ["Yolo", "57"],
    ["Nowhere", undefined],
    ["99", undefined],
  ])("%s -> %s", (input, expected) => {
    expect(countyCode(input)).toBe(expected);
  });
});
