import type {
  CaasppComparison,
  CaasppResult,
  Coordinates,
  DashboardSummary,
  SchoolRecord,
  SchoolSummary,
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

export function toSummary(record: SchoolRecord, from: Coordinates): SchoolSummary {
  const coords = record.school.coordinates;
  return {
    school: record.school,
    distanceMeters: coords ? haversineMeters(from, coords) : Number.POSITIVE_INFINITY,
    dashboard: summarizeDashboard(record),
    enrollment: record.enrollment?.total ?? record.privateDetail?.totalEnrollment ?? null,
    studentTeacherRatio: record.staff?.studentTeacherRatio ?? null,
  };
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
