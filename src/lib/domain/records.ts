import type {
  CaasppComparison,
  CaasppResult,
  Coordinates,
  DashboardSummary,
  School,
  SchoolRecord,
  SchoolSummary,
  SearchSummary,
} from "@/lib/schemas";
import { haversineMeters } from "./geo";

/**
 * Shape a stored SchoolRecord into what list rows and detail pages need.
 * Shared by the fixtures adapter and the Convex functions, so both backends
 * produce identical rows.
 */

export function summarizeDashboard(record: SchoolRecord): DashboardSummary {
  const summary: DashboardSummary = { year: null };
  for (const row of record.dashboard) {
    summary.year = summary.year === null ? row.year : Math.max(summary.year, row.year);
    summary[row.indicator] = { level: row.level, status: row.status, change: row.change };
  }
  return summary;
}

/** The distance-independent part of a search row, computed from a school's stored records. */
export function summaryOf(record: SchoolRecord): SearchSummary {
  return {
    dashboard: summarizeDashboard(record),
    enrollment: record.enrollment?.total ?? record.privateDetail?.totalEnrollment ?? null,
    studentTeacherRatio: record.staff?.studentTeacherRatio ?? null,
  };
}

/** A search row from a school and its precomputed summary. */
export function rowFromSummary(
  school: School,
  summary: SearchSummary,
  from: Coordinates,
): SchoolSummary {
  const coords = school.coordinates;
  return {
    school,
    distanceMeters: coords ? haversineMeters(from, coords) : Number.POSITIVE_INFINITY,
    ...summary,
  };
}

export function toSummary(record: SchoolRecord, from: Coordinates): SchoolSummary {
  return rowFromSummary(record.school, summaryOf(record), from);
}

/** All-grades, all-students percent met-and-above for one subject, or null. */
export function allGradesMetAndAbove(rows: CaasppResult[], subject: "ela" | "math"): number | null {
  const row = rows.find((r) => r.subject === subject && r.grade === "all");
  return row?.pctMetAndAbove ?? null;
}

export function buildComparison(
  school: CaasppResult[],
  district: CaasppResult[],
  state: CaasppResult[],
): CaasppComparison | null {
  const year = school[0]?.year ?? district[0]?.year ?? state[0]?.year;
  if (!year) return null;
  return {
    year,
    ela: {
      school: allGradesMetAndAbove(school, "ela"),
      district: allGradesMetAndAbove(district, "ela"),
      state: allGradesMetAndAbove(state, "ela"),
    },
    math: {
      school: allGradesMetAndAbove(school, "math"),
      district: allGradesMetAndAbove(district, "math"),
      state: allGradesMetAndAbove(state, "math"),
    },
  };
}
