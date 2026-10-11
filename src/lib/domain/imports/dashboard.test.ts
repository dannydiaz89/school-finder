import { describe, expect, it } from "vitest";
import { DashboardRow } from "@/lib/schemas/imports/dashboard";
import { dashboardIndicatorFromRow, isSchoolAllStudentsRow } from "./dashboard";

function raw(overrides: Record<string, string> = {}) {
  return DashboardRow.parse({
    cds: "34752830135194",
    rtype: "S",
    schoolname: "Paso Verde",
    districtname: "Natomas Unified",
    countyname: "Sacramento",
    studentgroup: "ALL",
    currdenom: "528",
    currstatus: "-22.7",
    priordenom: "510",
    priorstatus: "-7.4",
    change: "-15.3",
    statuslevel: "2",
    changelevel: "1",
    color: "2",
    box: "230",
    currnsizemet: "Y",
    indicator: "ELA",
    reportingyear: "2025",
    ...overrides,
  });
}

describe("dashboardIndicatorFromRow", () => {
  it("maps an ELA row with a level", () => {
    expect(dashboardIndicatorFromRow(raw())).toEqual({
      cds: "34752830135194",
      year: 2025,
      indicator: "ela",
      level: "orange",
      status: -22.7,
      change: -15.3,
      statusLevel: 2,
      changeLevel: 1,
      denominator: 528,
      nSizeMet: true,
    });
  });

  it("treats color 0, blank levels and blank status as null", () => {
    const out = dashboardIndicatorFromRow(
      raw({
        color: "0",
        statuslevel: "1",
        changelevel: "0",
        change: "",
        currnsizemet: "",
        currstatus: "",
      }),
    );
    expect(out).toMatchObject({
      level: null,
      status: null,
      change: null,
      statusLevel: 1,
      changeLevel: null,
      nSizeMet: false,
    });
  });

  it("accepts the chronic absenteeism file's changeLevel spelling", () => {
    const row = DashboardRow.parse({
      cds: "34752830135194",
      rtype: "S",
      studentgroup: "ALL",
      currdenom: "955",
      currstatus: "16.6",
      change: "-0.7",
      statuslevel: "2",
      changeLevel: "4",
      color: "3",
      currnsizemet: "Y",
      indicator: "CHRO",
      reportingyear: "2025",
    });
    expect(dashboardIndicatorFromRow(row)).toMatchObject({
      indicator: "chronicAbsenteeism",
      level: "yellow",
      changeLevel: 4,
    });
  });

  it.each([
    ["ELA", "ALL", "S", true],
    ["ELA", "AA", "S", false],
    ["ELA", "ALL", "D", false],
    ["ELPI", "EL", "S", true],
    ["ELPI", "ALL", "S", false],
    ["ELPI", "LTEL", "S", false],
  ])("%s %s %s all-students row: %s", (indicator, studentgroup, rtype, expected) => {
    expect(isSchoolAllStudentsRow(raw({ indicator, studentgroup, rtype }))).toBe(expected);
  });
});
