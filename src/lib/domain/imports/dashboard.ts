import { DashboardIndicator, type DashboardIndicatorId } from "@/lib/schemas";
import type { DashboardFileIndicator, DashboardRow } from "@/lib/schemas/imports/dashboard";
import { colorCodeToLevel } from "../levels";

/**
 * Dashboard research file row -> DashboardIndicator. Pure.
 */

/** File `indicator` column -> app indicator id. */
export const DASHBOARD_FILE_INDICATORS: Record<DashboardFileIndicator, DashboardIndicatorId> = {
  ELA: "ela",
  MATH: "math",
  CHRO: "chronicAbsenteeism",
  SUSP: "suspension",
  GRAD: "graduation",
  CCI: "collegeCareer",
  ELPI: "elpi",
  SCIENCE: "science",
};

/** File name per indicator for a Dashboard year, e.g. eladownload2025.txt. */
export const DASHBOARD_FILE_NAMES: Record<DashboardIndicatorId, (year: number) => string> = {
  ela: (y) => `eladownload${y}.txt`,
  math: (y) => `mathdownload${y}.txt`,
  chronicAbsenteeism: (y) => `chronicdownload${y}.txt`,
  suspension: (y) => `suspdownload${y}.txt`,
  graduation: (y) => `graddownload${y}.txt`,
  collegeCareer: (y) => `ccidownload${y}.txt`,
  elpi: (y) => `elpidownload${y}.txt`,
  science: (y) => `sciencedownload${y}.txt`,
};

/**
 * The row that stands for "all students" at a school. The English Learner
 * Progress Indicator only reports English learners, so its all-students row
 * is the EL group. The 2023 ELPI file has no group column at all.
 */
export function isSchoolAllStudentsRow(row: DashboardRow): boolean {
  if (row.rtype !== "S") return false;
  // A file with no student-group column has a single row per school.
  if (row.studentgroup === undefined) return true;
  const group = row.indicator === "ELPI" ? "EL" : "ALL";
  return row.studentgroup === group;
}

/** 1-5 stays; 0, blank and anything else is "no level". */
function levelOrNull(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

export function dashboardIndicatorFromRow(row: DashboardRow): DashboardIndicator {
  return DashboardIndicator.parse({
    cds: row.cds,
    year: row.reportingyear,
    indicator: DASHBOARD_FILE_INDICATORS[row.indicator],
    level: colorCodeToLevel(row.color),
    status: row.currstatus,
    change: row.change,
    statusLevel: levelOrNull(row.statuslevel),
    changeLevel: levelOrNull(row.changelevel),
    denominator: row.currdenom,
    nSizeMet: row.currnsizemet === "Y",
  });
}
