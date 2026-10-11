import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import type { SchoolDetail } from "@/lib/schemas";
import {
  caasppYear,
  dashboardIndicator,
  dashboardIndicatorsPresent,
  dashboardYear,
  englishLearnerFraction,
  enrollmentTotal,
  exceedsMax,
  gradeSpan,
  hasTransitionalKindergarten,
  isPointsIndicator,
  programs,
  testScore,
} from "./facts";

function detail(name: string, patch: Partial<SchoolDetail> = {}): SchoolDetail {
  const record = fixtures.schools.find((r) => r.school.name === name);
  if (!record) throw new Error(`fixture missing: ${name}`);
  return { ...record, caasppComparison: null, ...patch };
}

const judah = detail("Theodore Judah Elementary");
const mcclatchy = detail("C. K. McClatchy High");
const stFrancis = detail("St. Francis of Assisi Elementary School");
const virtualAcademy = detail("Washington Unified Virtual Academy");
const landPark = detail("William Land Elementary");

describe("Dashboard facts", () => {
  it("finds the newest row per indicator", () => {
    expect(dashboardIndicator(judah, "ela")?.level).toBe("green");
    expect(dashboardIndicator(judah, "graduation")).toBeUndefined();
    expect(dashboardIndicator(stFrancis, "ela")).toBeUndefined();
    const older = { ...judah.dashboard[0], year: 2024, level: "red" as const };
    expect(
      dashboardIndicator(
        detail("Theodore Judah Elementary", { dashboard: [older, ...judah.dashboard] }),
        "ela",
      )?.level,
    ).toBe("green");
  });

  it("lists indicators any school has, in Dashboard order", () => {
    expect(dashboardIndicatorsPresent([judah, mcclatchy])).toEqual([
      "ela",
      "math",
      "chronicAbsenteeism",
      "suspension",
      "graduation",
      "collegeCareer",
      "science",
    ]);
    expect(dashboardIndicatorsPresent([stFrancis])).toEqual([]);
  });

  it("reports the newest year or null", () => {
    expect(dashboardYear([judah, stFrancis])).toBe(2025);
    expect(dashboardYear([stFrancis])).toBeNull();
  });

  it("knows which statuses are points and which are percentages", () => {
    expect(isPointsIndicator("ela")).toBe(true);
    expect(isPointsIndicator("math")).toBe(true);
    expect(isPointsIndicator("suspension")).toBe(false);
  });
});

describe("CAASPP facts", () => {
  const comparison = {
    year: "2024-25",
    ela: { school: 62.73, district: 40, state: 47 },
    math: { school: null, district: 30, state: 35 },
  } as const;
  it("reads the school's own percent met-and-above", () => {
    const tested = detail("Theodore Judah Elementary", { caasppComparison: comparison });
    expect(testScore(tested, "ela")).toBeCloseTo(62.73);
    expect(testScore(tested, "math")).toBeNull();
    expect(testScore(stFrancis, "ela")).toBeNull();
    expect(caasppYear([tested, stFrancis])).toBe("2024-25");
    expect(caasppYear([stFrancis])).toBeNull();
  });
});

describe("school facts", () => {
  it("shows transitional kindergarten only when the data proves it", () => {
    expect(hasTransitionalKindergarten(judah)).toBe(true); // 48 TK students
    expect(hasTransitionalKindergarten(mcclatchy)).toBe(false);
    expect(hasTransitionalKindergarten(stFrancis)).toBe(false);
    const servedFromTk = detail("C. K. McClatchy High", {
      school: { ...mcclatchy.school, gradesServed: { low: "TK", high: "12" } },
    });
    expect(hasTransitionalKindergarten(servedFromTk)).toBe(true);
  });

  it("lists only the program flags that are true", () => {
    expect(programs(judah)).toEqual([]);
    expect(programs(landPark)).toEqual(["multilingual"]);
    expect(programs(virtualAcademy)).toEqual(["virtual"]);
    expect(programs(stFrancis)).toEqual([]);
    expect(
      programs(detail("Theodore Judah Elementary", { school: { ...judah.school, magnet: true } })),
    ).toEqual(["magnet"]);
  });

  it("takes enrollment from Census Day or the private affidavit", () => {
    expect(enrollmentTotal(judah)).toBe(485);
    expect(enrollmentTotal(stFrancis)).toBe(294);
    expect(enrollmentTotal(detail("Theodore Judah Elementary", { enrollment: null }))).toBeNull();
  });

  it("computes the English learner share only when both numbers exist", () => {
    expect(englishLearnerFraction(judah)).toBeCloseTo(25 / 485);
    expect(englishLearnerFraction(stFrancis)).toBeNull();
  });

  it("prefers the served span over the offered span", () => {
    expect(gradeSpan(virtualAcademy)).toEqual({ low: "4", high: "8" });
    expect(gradeSpan(stFrancis)).toEqual({ low: "K", high: "8" });
  });
});

describe("exceedsMax", () => {
  it("counts distinct codes in the raw query value", () => {
    expect(exceedsMax(null)).toBe(false);
    expect(exceedsMax("a,b,c,d,e")).toBe(false);
    expect(exceedsMax("a,b,c,d,e,a, ,")).toBe(false);
    expect(exceedsMax("a,b,c,d,e,f")).toBe(true);
  });
});
