import { toDetail } from "@/lib/domain/records";
import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import { formatMiles, haversineMeters } from "@/lib/domain/geo";
import {
  DashboardIndicator as DashboardIndicatorSchema,
  type DashboardIndicator,
  type SchoolDetail,
} from "@/lib/schemas";
import {
  LOWER_IS_BETTER,
  ROW_MARGIN,
  bestDashboardIndexes,
  bestInRow,
  bestIndexes,
  dashboardLevelRank,
  distanceMeters,
  rowValue,
} from "./best";

// Downtown Sacramento, as the search page would put it in the URL.
const home = { latitude: 38.5781, longitude: -121.4944 };

function detail(name: string, patch: Partial<SchoolDetail> = {}): SchoolDetail {
  const record = fixtures.schools.find((r) => r.school.name === name);
  if (!record) throw new Error(`fixture missing: ${name}`);
  // Built the way the app builds it, so only the newest year is "current".
  return { ...toDetail(record, [], []), ...patch };
}

const judah = detail("Theodore Judah Elementary"); // ELA green, math green, 62.73 / 57.01, ratio 22.4
const crocker = detail("Crocker/Riverside Elementary"); // ELA blue, math blue, 79.67 / 80.82, ratio 26
const lubin = detail("David Lubin Elementary"); // ELA blue, math green, 67.98 / 57.87, ratio 20.7
const stFrancis = detail("St. Francis of Assisi Elementary School"); // private
const benjamin = detail("Arthur A. Benjamin Health Professions High"); // ELA level null (n-size not met)

describe("bestIndexes", () => {
  it("picks the highest or lowest value", () => {
    expect(bestIndexes([1, 3, 2], "highest")).toEqual([1]);
    expect(bestIndexes([1, 3, 2], "lowest")).toEqual([0]);
  });

  it("returns every tied index, unless every value ties", () => {
    expect(bestIndexes([5, 2, 5], "highest")).toEqual([0, 2]);
    // Two schools with the same value: nothing stands out.
    expect(bestIndexes([0.9, 0.9], "lowest")).toEqual([]);
  });

  it("ignores missing values", () => {
    expect(bestIndexes([null, 4, undefined, 7], "highest")).toEqual([3]);
    expect(bestIndexes([null, 4, Number.POSITIVE_INFINITY, 7], "lowest")).toEqual([1]);
  });

  it("needs at least two values before anything is best", () => {
    expect(bestIndexes([], "highest")).toEqual([]);
    expect(bestIndexes([null, null], "highest")).toEqual([]);
    expect(bestIndexes([null, 42], "lowest")).toEqual([]);
  });

  it("treats values closer than the margin as the same", () => {
    // 73% beside 74%: no lead worth marking.
    expect(bestIndexes([73, 74], "highest", 2)).toEqual([]);
    expect(bestIndexes([72, 74], "highest", 2)).toEqual([1]);
    // 2.5 mi beside 2.4 mi.
    expect(bestIndexes([2.5, 2.4], "lowest", 0.25)).toEqual([]);
    expect(bestIndexes([2.7, 2.4], "lowest", 0.25)).toEqual([1]);
  });

  it("marks every value within the margin of the best when another trails", () => {
    expect(bestIndexes([74, 73, 60], "highest", 2)).toEqual([0, 1]);
    expect(bestIndexes([17.2, 23.6, 17.9], "lowest", 1)).toEqual([0, 2]);
  });
});

describe("rowValue", () => {
  it("ranks Dashboard levels 1 to 5 and treats no level as missing", () => {
    expect(dashboardLevelRank(judah, "ela")).toBe(4);
    expect(dashboardLevelRank(crocker, "ela")).toBe(5);
    expect(dashboardLevelRank(benjamin, "ela")).toBeNull();
    expect(dashboardLevelRank(judah, "graduation")).toBeNull();
  });

  it("returns null for private schools on Dashboard and test rows", () => {
    expect(rowValue(stFrancis, { kind: "dashboard", indicator: "ela" })).toBeNull();
    expect(rowValue(stFrancis, { kind: "test", subject: "math" })).toBeNull();
    expect(rowValue(stFrancis, { kind: "studentTeacher" })).toBeNull();
  });

  it("reads test scores and ratios from the detail", () => {
    // Rounded the way the table prints it: 62.73% reads "63%".
    expect(rowValue(judah, { kind: "test", subject: "ela" })).toBe(63);
    expect(rowValue(judah, { kind: "studentTeacher" })).toBeCloseTo(22.4);
    expect(
      rowValue(detail("Theodore Judah Elementary", { staff: null }), { kind: "studentTeacher" }),
    ).toBeNull();
  });

  it("measures distance from the home coordinates", () => {
    const expected = haversineMeters(home, judah.school.coordinates!);
    // In miles to one decimal, as printed, so two schools that both read "0.5 mi" tie.
    expect(rowValue(judah, { kind: "distance" }, home)).toBe(formatMiles(expected));
    expect(distanceMeters(judah, undefined)).toBeNull();
    expect(
      distanceMeters(
        detail("Theodore Judah Elementary", {
          school: { ...judah.school, coordinates: undefined },
        }),
        home,
      ),
    ).toBeNull();
  });
});

/** A copy of a real school with one Dashboard indicator's level and status replaced. */
function withIndicator(
  base: SchoolDetail,
  cds: string,
  indicator: DashboardIndicator["indicator"],
  level: DashboardIndicator["level"],
  status: number | null,
): SchoolDetail {
  const source = base.dashboard.find((r) => r.indicator === indicator) ?? base.dashboard[0];
  const row = DashboardIndicatorSchema.parse({ ...source, cds, indicator, level, status });
  return {
    ...base,
    school: { ...base.school, cds: cds as SchoolDetail["school"]["cds"] },
    dashboard: [...base.dashboard.filter((r) => r.indicator !== indicator), row],
  };
}

const A = "19644856089148"; // Leffingwell Elementary
const B = "19644856013080"; // Murphy Ranch Elementary
const C = "19644856013106"; // Orchard Dale Elementary

describe("bestDashboardIndexes", () => {
  const pair = (
    indicator: DashboardIndicator["indicator"],
    a: [DashboardIndicator["level"], number | null],
    b: [DashboardIndicator["level"], number | null],
  ) =>
    bestDashboardIndexes(
      [withIndicator(judah, A, indicator, ...a), withIndicator(judah, B, indicator, ...b)],
      indicator,
    );

  it("marks nothing when the same color hides a difference inside the state's band", () => {
    // Leffingwell and Murphy Ranch, 2025: both Blue, 52.9 and 52.1 points above standard.
    expect(pair("ela", ["blue", 52.9], ["blue", 52.1])).toEqual([]);
    expect(pair("math", ["blue", 38.2], ["blue", 36.3])).toEqual([]);
  });

  it("lets the number decide on the same color when the lead is clear", () => {
    expect(pair("ela", ["blue", 68.9], ["blue", 47.2])).toEqual([0]);
    // Both Green in science: 60.2% and 64.4%, more than the 2-point band apart.
    expect(pair("science", ["green", 60.2], ["green", 64.4])).toEqual([1]);
  });

  it("marks nothing when the better color has the clearly weaker number", () => {
    // Yellow at 6.7% chronically absent beside Orange at 6%: color and number disagree.
    expect(pair("chronicAbsenteeism", ["yellow", 6.7], ["orange", 6])).toEqual([]);
  });

  it("marks the better color when the number agrees or is within the band", () => {
    expect(pair("suspension", ["blue", 0.5], ["orange", 1.3])).toEqual([0]);
    // Yellow at 6.2% beside Orange at 6%: 0.2 is inside the 0.5 band, so the color stands.
    expect(pair("chronicAbsenteeism", ["yellow", 6.2], ["orange", 6])).toEqual([0]);
  });

  it("never marks a school without a color, and needs two rated schools", () => {
    expect(pair("ela", [null, 80], ["green", 10])).toEqual([]);
    expect(pair("ela", ["blue", 80], [null, null])).toEqual([]);
  });

  it("keeps every leader within the band and drops one a lower color beats", () => {
    const three = (c: [DashboardIndicator["level"], number]) =>
      bestDashboardIndexes(
        [
          withIndicator(judah, A, "ela", "blue", 50),
          withIndicator(judah, B, "ela", "blue", 48.5),
          withIndicator(judah, C, "ela", ...c),
        ],
        "ela",
      );
    expect(three(["green", 20])).toEqual([0, 1]);
    // Green at 52 is clearly above the Blue at 48.5 but not the Blue at 50.
    expect(three(["green", 52])).toEqual([0]);
    expect(three(["blue", 49])).toEqual([]);
  });

  it("does not compare points from one year with a percent from another", () => {
    const older = withIndicator(judah, A, "science", "green", -8.6);
    older.dashboard = older.dashboard.map((r) =>
      r.indicator === "science" ? { ...r, year: 2024 } : r,
    );
    expect(
      bestDashboardIndexes([older, withIndicator(judah, B, "science", "blue", 65.5)], "science"),
    ).toEqual([]);
  });
});

describe("bestInRow", () => {
  it("emphasizes the highest Dashboard level, then the clearly better measure on the same level", () => {
    // Crocker and Lubin are both Blue on ELA, 68.9 and 47.2 points above standard.
    expect(bestInRow([judah, crocker, lubin], { kind: "dashboard", indicator: "ela" })).toEqual(
      new Set([crocker.school.cds]),
    );
    expect(bestInRow([judah, crocker, lubin], { kind: "dashboard", indicator: "math" })).toEqual(
      new Set([crocker.school.cds]),
    );
  });

  it("treats a smaller number as better for suspension and absenteeism", () => {
    // Both Blue on suspension: Crocker 0.5%, Lubin 1%. The band for suspension is 0.3.
    expect(bestInRow([crocker, lubin], { kind: "dashboard", indicator: "suspension" })).toEqual(
      new Set([crocker.school.cds]),
    );
    expect(LOWER_IS_BETTER.has("chronicAbsenteeism")).toBe(true);
    expect(LOWER_IS_BETTER.has("graduation")).toBe(false);
  });

  it("emphasizes nothing when a school is compared with itself", () => {
    expect(bestInRow([crocker, crocker], { kind: "dashboard", indicator: "ela" }).size).toBe(0);
    expect(bestInRow([crocker, crocker], { kind: "test", subject: "ela" }).size).toBe(0);
  });

  it("emphasizes the highest test score", () => {
    expect(bestInRow([judah, crocker, stFrancis], { kind: "test", subject: "math" })).toEqual(
      new Set([crocker.school.cds]),
    );
  });

  it("emphasizes the lowest student-teacher ratio", () => {
    // 22.4, 26 and 20.7: Lubin leads by more than one student per teacher.
    expect(bestInRow([judah, crocker, lubin], { kind: "studentTeacher" })).toEqual(
      new Set([lubin.school.cds]),
    );
  });

  it("emphasizes the schools nearest home, within a quarter mile of each other", () => {
    const schools = [judah, crocker, lubin];
    const miles = schools.map((s) => formatMiles(haversineMeters(home, s.school.coordinates!)));
    const nearest = Math.min(...miles);
    const expected = schools.filter(
      (_, i) => Math.round((miles[i] - nearest) * 10) / 10 < ROW_MARGIN.distance,
    );
    const got = bestInRow(schools, { kind: "distance" }, home);
    expect(got).toEqual(
      expected.length === schools.length ? new Set() : new Set(expected.map((s) => s.school.cds)),
    );
    expect(bestInRow(schools, { kind: "distance" })).toEqual(new Set());
  });

  it("emphasizes nothing when only one school has a value", () => {
    expect(bestInRow([judah, stFrancis], { kind: "dashboard", indicator: "ela" })).toEqual(
      new Set(),
    );
    expect(bestInRow([judah, benjamin], { kind: "dashboard", indicator: "ela" })).toEqual(
      new Set(),
    );
    expect(bestInRow([stFrancis], { kind: "test", subject: "ela" })).toEqual(new Set());
  });
});
