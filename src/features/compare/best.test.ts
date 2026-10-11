import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import { haversineMeters } from "@/lib/domain/geo";
import type { SchoolDetail } from "@/lib/schemas";
import { bestIndexes, bestInRow, dashboardLevelRank, distanceMeters, rowValue } from "./best";

// Downtown Sacramento, as the search page would put it in the URL.
const home = { latitude: 38.5781, longitude: -121.4944 };

function detail(name: string, patch: Partial<SchoolDetail> = {}): SchoolDetail {
  const record = fixtures.schools.find((r) => r.school.name === name);
  if (!record) throw new Error(`fixture missing: ${name}`);
  const comparison =
    record.school.type === "private"
      ? null
      : {
          year: record.caaspp[0]?.year ?? "2024-25",
          ela: {
            school:
              record.caaspp.find((c) => c.subject === "ela" && c.grade === "all")?.pctMetAndAbove ??
              null,
            district: null,
            state: null,
          },
          math: {
            school:
              record.caaspp.find((c) => c.subject === "math" && c.grade === "all")
                ?.pctMetAndAbove ?? null,
            district: null,
            state: null,
          },
        };
  return { ...record, caasppComparison: comparison, ...patch };
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

  it("returns every tied index", () => {
    expect(bestIndexes([5, 2, 5], "highest")).toEqual([0, 2]);
    expect(bestIndexes([0.9, 0.9], "lowest")).toEqual([0, 1]);
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
    expect(rowValue(judah, { kind: "test", subject: "ela" })).toBeCloseTo(62.73);
    expect(rowValue(judah, { kind: "studentTeacher" })).toBeCloseTo(22.4);
    expect(
      rowValue(detail("Theodore Judah Elementary", { staff: null }), { kind: "studentTeacher" }),
    ).toBeNull();
  });

  it("measures distance from the home coordinates", () => {
    const expected = haversineMeters(home, judah.school.coordinates!);
    expect(rowValue(judah, { kind: "distance" }, home)).toBeCloseTo(expected);
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

describe("bestInRow", () => {
  it("emphasizes the highest Dashboard level, all of them on a tie", () => {
    expect(bestInRow([judah, crocker, lubin], { kind: "dashboard", indicator: "ela" })).toEqual(
      new Set([crocker.school.cds, lubin.school.cds]),
    );
    expect(bestInRow([judah, crocker, lubin], { kind: "dashboard", indicator: "math" })).toEqual(
      new Set([crocker.school.cds]),
    );
  });

  it("emphasizes the highest test score", () => {
    expect(bestInRow([judah, crocker, stFrancis], { kind: "test", subject: "math" })).toEqual(
      new Set([crocker.school.cds]),
    );
  });

  it("emphasizes the lowest student-teacher ratio", () => {
    expect(bestInRow([judah, crocker, lubin], { kind: "studentTeacher" })).toEqual(
      new Set([lubin.school.cds]),
    );
  });

  it("emphasizes the shortest distance from home", () => {
    const nearest = [judah, crocker, lubin]
      .map((s) => ({ s, d: haversineMeters(home, s.school.coordinates!) }))
      .sort((a, b) => a.d - b.d)[0].s;
    expect(bestInRow([judah, crocker, lubin], { kind: "distance" }, home)).toEqual(
      new Set([nearest.school.cds]),
    );
    expect(bestInRow([judah, crocker, lubin], { kind: "distance" })).toEqual(new Set());
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
