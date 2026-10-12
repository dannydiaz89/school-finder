import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import type { CaasppResult, DashboardIndicator, SchoolRecord } from "@/lib/schemas";
import {
  SCIENCE_PERCENT_FROM_YEAR,
  caasppHistory,
  caasppYears,
  currentCaaspp,
  currentDashboard,
  dashboardYears,
  indicatorHistory,
  latestCaasppYear,
  latestDashboardYear,
  statusUnit,
} from "./history";
import { buildComparison, summarizeDashboard, toDetail } from "./records";

const judah = fixtures.schools.find((r) => r.school.name === "Theodore Judah Elementary")!;
const cds = judah.school.cds;

const dash = (
  year: number,
  indicator: DashboardIndicator["indicator"],
  level: DashboardIndicator["level"],
  status: number,
): DashboardIndicator => ({
  cds,
  year,
  indicator,
  level,
  status,
  change: 0,
  statusLevel: 3,
  changeLevel: 3,
  denominator: 100,
  nSizeMet: true,
});
const test = (
  year: string,
  subject: CaasppResult["subject"],
  pct: number,
  grade: CaasppResult["grade"] = "all",
): CaasppResult => ({
  cds,
  year,
  subject,
  grade,
  studentsTested: 100,
  meanScaleScore: null,
  pctExceeded: null,
  pctMet: null,
  pctMetAndAbove: pct,
  pctNearlyMet: null,
  pctNotMet: null,
});

// Deliberately out of order, with the newest year in the middle.
const dashboard = [
  dash(2023, "ela", "yellow", -5),
  dash(2025, "ela", "green", 31.5),
  dash(2024, "ela", "orange", 2),
  dash(2024, "math", "red", -60),
  dash(2025, "math", "green", 5.8),
  dash(2023, "suspension", "blue", 0.2),
];
const caaspp = [
  test("2023-24", "ela", 55),
  test("2024-25", "ela", 63),
  test("2022-23", "ela", 50),
  test("2024-25", "ela", 70, "3"),
  test("2024-25", "math", 57),
  test("2022-23", "math", 41),
];
const record: SchoolRecord = { ...judah, dashboard, caaspp };

describe("what counts as current", () => {
  it("is every indicator from the newest year, whatever order the rows come in", () => {
    expect(latestDashboardYear(dashboard)).toBe(2025);
    expect(
      currentDashboard(dashboard)
        .map((r) => `${r.indicator}:${r.level}`)
        .sort(),
    ).toEqual(["ela:green", "math:green"]);
    expect(currentDashboard([])).toEqual([]);
    expect(latestDashboardYear([])).toBeNull();
  });

  it("does not show an indicator from an older year as current", () => {
    // Suspension was last reported in 2023; it is history, not today's rating.
    expect(currentDashboard(dashboard).some((r) => r.indicator === "suspension")).toBe(false);
    expect(summarizeDashboard(record).suspension).toBeUndefined();
  });

  it("summarizes search rows from the newest year only", () => {
    const summary = summarizeDashboard(record);
    expect(summary.year).toBe(2025);
    expect(summary.ela).toEqual({ level: "green", status: 31.5, change: 0 });
    expect(summary.math?.level).toBe("green");
    // The same answer with the rows reversed.
    expect(summarizeDashboard({ ...record, dashboard: [...dashboard].reverse() })).toEqual(summary);
  });

  it("picks the newest test year", () => {
    expect(latestCaasppYear(caaspp)).toBe("2024-25");
    expect(currentCaaspp(caaspp).every((r) => r.year === "2024-25")).toBe(true);
  });
});

describe("history", () => {
  it("lists one indicator oldest first", () => {
    expect(indicatorHistory(dashboard, "ela").map((r) => [r.year, r.level])).toEqual([
      [2023, "yellow"],
      [2024, "orange"],
      [2025, "green"],
    ]);
    expect(indicatorHistory(dashboard, "graduation")).toEqual([]);
    expect(dashboardYears(dashboard)).toEqual([2023, 2024, 2025]);
  });

  it("lists all-grades test results oldest first and ignores single grades", () => {
    expect(caasppHistory(caaspp, "ela").map((r) => [r.year, r.pctMetAndAbove])).toEqual([
      ["2022-23", 50],
      ["2023-24", 55],
      ["2024-25", 63],
    ]);
    expect(caasppHistory(caaspp, "math").map((r) => r.year)).toEqual(["2022-23", "2024-25"]);
  });
});

describe("toDetail", () => {
  it("puts the newest year in the main fields and every year in history", () => {
    const detail = toDetail(
      record,
      [test("2024-25", "ela", 40), test("2023-24", "ela", 39)],
      [test("2024-25", "ela", 48)],
    );
    expect(detail.dashboard.every((r) => r.year === 2025)).toBe(true);
    expect(detail.caaspp.every((r) => r.year === "2024-25")).toBe(true);
    expect(detail.history.dashboard).toHaveLength(dashboard.length);
    expect(detail.history.dashboard.map((r) => r.year)).toEqual([
      2023, 2023, 2024, 2024, 2025, 2025,
    ]);
    expect(detail.history.caaspp.every((r) => r.grade === "all")).toBe(true);
    // The comparison uses the same year for the school, its district, and the state.
    expect(detail.caasppComparison).toMatchObject({
      year: "2024-25",
      ela: { school: 63, district: 40, state: 48 },
    });
  });

  it("compares against the district in the school's newest year, not the district's", () => {
    const comparison = buildComparison(
      [test("2023-24", "ela", 55)],
      [test("2024-25", "ela", 40), test("2023-24", "ela", 39)],
      [test("2023-24", "ela", 47)],
    );
    expect(comparison).toMatchObject({
      year: "2023-24",
      ela: { school: 55, district: 39, state: 47 },
    });
  });

  it("gives a private school no comparison and an empty history", () => {
    const priv = fixtures.schools.find((r) => r.school.type === "private")!;
    const detail = toDetail(priv, [], []);
    expect(detail.caasppComparison).toBeNull();
    expect(detail.history).toEqual({ dashboard: [], caaspp: [] });
  });

  it("keeps every row of the newest year for a real school", () => {
    const detail = toDetail(judah, [], fixtures.stateCaaspp);
    const newest = Math.max(...judah.dashboard.map((r) => r.year));
    expect(detail.dashboard).toHaveLength(judah.dashboard.filter((r) => r.year === newest).length);
    expect(detail.caaspp.every((r) => r.year === "2024-25")).toBe(true);
    expect(detail.history.dashboard.length).toBeGreaterThan(detail.dashboard.length);
  });
});

describe("statusUnit", () => {
  it("is points for ELA and Math, and for science before it became a percent", () => {
    expect(statusUnit("ela", 2023)).toBe("points");
    expect(statusUnit("math", 2025)).toBe("points");
    expect(statusUnit("science", 2024)).toBe("points");
    expect(statusUnit("science", SCIENCE_PERCENT_FROM_YEAR)).toBe("percent");
    expect(statusUnit("suspension", 2023)).toBe("percent");
  });
});

describe("caasppYears", () => {
  it("lists school years oldest first, once each", () => {
    expect(caasppYears(judah.caaspp)).toEqual(["2022-23", "2023-24", "2024-25"]);
    expect(caasppYears([])).toEqual([]);
  });
});
