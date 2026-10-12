import { describe, expect, it } from "vitest";
import { maintainedBand } from "./bands";

describe("maintainedBand", () => {
  it.each([
    ["ela", 2025, 3],
    ["math", 2023, 3],
    ["chronicAbsenteeism", 2025, 0.5],
    ["suspension", 2025, 0.3],
    ["graduation", 2025, 1],
    ["collegeCareer", 2025, 2],
    ["elpi", 2025, 2],
    ["science", 2025, 2],
    // Science was distance from standard in points before 2025.
    ["science", 2024, 3],
  ] as const)("%s in %i is %f", (indicator, year, band) => {
    expect(maintainedBand(indicator, year)).toBe(band);
  });
});
