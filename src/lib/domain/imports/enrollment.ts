import { Enrollment, type Grade, type GradeCount, type RaceEthnicity } from "@/lib/schemas";
import type { EnrollmentRow } from "@/lib/schemas/imports/enrollment";
import { cdsFromParts } from "./common";

/**
 * Census Day enrollment rows -> Enrollment. The file has one row per school
 * per reporting category, so rows are folded into an accumulator per school
 * and finished once every row for that school has been seen. Pure.
 */

/** Race/ethnicity reporting categories -> domain codes. */
export const RACE_CATEGORIES: Record<string, RaceEthnicity> = {
  RE_B: "RB",
  RE_I: "RI",
  RE_A: "RA",
  RE_F: "RF",
  RE_H: "RH",
  RE_D: "RD",
  RE_P: "RP",
  RE_T: "RT",
  RE_W: "RW",
};

const GRADE_COLUMNS = [
  ["GR_TK", "TK"],
  ["GR_KN", "K"],
  ["GR_01", "1"],
  ["GR_02", "2"],
  ["GR_03", "3"],
  ["GR_04", "4"],
  ["GR_05", "5"],
  ["GR_06", "6"],
  ["GR_07", "7"],
  ["GR_08", "8"],
  ["GR_09", "9"],
  ["GR_10", "10"],
  ["GR_11", "11"],
  ["GR_12", "12"],
] as const satisfies readonly [keyof EnrollmentRow, Grade][];

export interface EnrollmentAccumulator {
  cds: string;
  year: string;
  total?: number;
  byGrade: GradeCount[];
  race: Partial<Record<RaceEthnicity, number>>;
  englishLearners?: number;
  studentsWithDisabilities?: number;
  socioeconomicallyDisadvantaged?: number;
}

export function enrollmentCds(row: EnrollmentRow): string {
  return cdsFromParts(row.CountyCode, row.DistrictCode, row.SchoolCode);
}

export function startEnrollment(row: EnrollmentRow): EnrollmentAccumulator {
  return { cds: enrollmentCds(row), year: row.AcademicYear, byGrade: [], race: {} };
}

export function addEnrollmentRow(acc: EnrollmentAccumulator, row: EnrollmentRow): void {
  const total = row.TOTAL_ENR;
  const category = row.ReportingCategory;
  if (category === "TA") {
    acc.total = total ?? undefined;
    acc.byGrade = [];
    for (const [column, grade] of GRADE_COLUMNS) {
      const count = row[column];
      if (count !== null && count > 0) acc.byGrade.push({ grade, count });
    }
  } else if (category in RACE_CATEGORIES && total !== null) {
    acc.race[RACE_CATEGORIES[category]] = total;
  } else if (category === "SG_EL" && total !== null) acc.englishLearners = total;
  else if (category === "SG_DS" && total !== null) acc.studentsWithDisabilities = total;
  else if (category === "SG_SD" && total !== null) acc.socioeconomicallyDisadvantaged = total;
}

/** Null when the school had no all-students total (suppressed or missing). */
export function finishEnrollment(acc: EnrollmentAccumulator): Enrollment | null {
  if (acc.total === undefined) return null;
  return Enrollment.parse({
    cds: acc.cds,
    year: acc.year,
    total: acc.total,
    byGrade: acc.byGrade,
    byRaceEthnicity: acc.race,
    englishLearners: acc.englishLearners,
    studentsWithDisabilities: acc.studentsWithDisabilities,
    socioeconomicallyDisadvantaged: acc.socioeconomicallyDisadvantaged,
  });
}
