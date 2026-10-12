import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import { changeKind, maintainedBand } from "./bands";

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

describe("changeKind", () => {
  it("names a change the way the Dashboard does", () => {
    expect(changeKind("ela", 2025, 3.6)).toBe("increased");
    expect(changeKind("ela", 2025, 2.4)).toBe("maintained");
    expect(changeKind("ela", 2025, -3)).toBe("declined");
    expect(changeKind("suspension", 2025, 0.2)).toBe("maintained");
    expect(changeKind("suspension", 2025, -0.5)).toBe("declined");
    expect(changeKind("chronicAbsenteeism", 2025, 0)).toBe("maintained");
    expect(changeKind("ela", 2025, null)).toBeNull();
  });

  it("agrees with the change level the state published for every fixture row", () => {
    const rows = fixtures.schools.flatMap((r) => r.dashboard).filter((r) => r.changeLevel !== null);
    expect(rows.length).toBeGreaterThan(300);
    const disagreements = rows.filter(
      (r) => (changeKind(r.indicator, r.year, r.change) === "maintained") !== (r.changeLevel === 3),
    );
    expect(disagreements).toEqual([]);
  });
});
