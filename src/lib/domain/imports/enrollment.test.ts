import { describe, expect, it } from "vitest";
import { EnrollmentRow } from "@/lib/schemas/imports/enrollment";
import { addEnrollmentRow, enrollmentCds, finishEnrollment, startEnrollment } from "./enrollment";

function raw(category: string, total: string, grades: Partial<Record<string, string>> = {}) {
  return EnrollmentRow.parse({
    AcademicYear: "2024-25",
    AggregateLevel: "S",
    CountyCode: "34",
    DistrictCode: "75283",
    SchoolCode: "0135194",
    CountyName: "Sacramento",
    DistrictName: "Natomas Unified",
    SchoolName: "Paso Verde",
    Charter: "N",
    ReportingCategory: category,
    TOTAL_ENR: total,
    GR_TK: "0",
    GR_KN: "0",
    GR_01: "0",
    GR_02: "0",
    GR_03: "0",
    GR_04: "0",
    GR_05: "0",
    GR_06: "0",
    GR_07: "0",
    GR_08: "0",
    GR_09: "0",
    GR_10: "0",
    GR_11: "0",
    GR_12: "0",
    ...grades,
  });
}

describe("enrollment accumulator", () => {
  it("folds total, grades, race and student groups", () => {
    const total = raw("TA", "955", { GR_KN: "120", GR_01: "110", GR_08: "95", GR_TK: "30" });
    const acc = startEnrollment(total);
    expect(enrollmentCds(total)).toBe("34752830135194");
    addEnrollmentRow(acc, total);
    addEnrollmentRow(acc, raw("RE_H", "400"));
    addEnrollmentRow(acc, raw("RE_W", "*"));
    addEnrollmentRow(acc, raw("SG_EL", "120"));
    addEnrollmentRow(acc, raw("SG_DS", "80"));
    addEnrollmentRow(acc, raw("SG_SD", "600"));
    addEnrollmentRow(acc, raw("GN_F", "470"));
    expect(finishEnrollment(acc)).toEqual({
      cds: "34752830135194",
      year: "2024-25",
      total: 955,
      byGrade: [
        { grade: "TK", count: 30 },
        { grade: "K", count: 120 },
        { grade: "1", count: 110 },
        { grade: "8", count: 95 },
      ],
      byRaceEthnicity: { RH: 400 },
      englishLearners: 120,
      studentsWithDisabilities: 80,
      socioeconomicallyDisadvantaged: 600,
    });
  });

  it("is null without an all-students total", () => {
    const row = raw("RE_H", "400");
    const acc = startEnrollment(row);
    addEnrollmentRow(acc, row);
    expect(finishEnrollment(acc)).toBeNull();
    const suppressed = raw("TA", "*");
    const acc2 = startEnrollment(suppressed);
    addEnrollmentRow(acc2, suppressed);
    expect(finishEnrollment(acc2)).toBeNull();
  });
});
