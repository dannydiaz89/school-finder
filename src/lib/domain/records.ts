import type {
  CaasppComparison,
  CaasppResult,
  Coordinates,
  DashboardSummary,
  School,
  SchoolDetail,
  SchoolRecord,
  SchoolSummary,
  SearchSummary,
} from "@/lib/schemas";
import { haversineMeters } from "./geo";
import {
  caasppForYear,
  caasppHistory,
  currentCaaspp,
  currentDashboard,
  latestCaasppYear,
  latestDashboardYear,
} from "./history";

/**
 * Shape a stored SchoolRecord into what list rows and detail pages need.
 * Shared by the fixtures adapter and the Convex functions, so both backends
 * produce identical rows.
 */

export function summarizeDashboard(record: SchoolRecord): DashboardSummary {
  const summary: DashboardSummary = { year: latestDashboardYear(record.dashboard) };
  // Only the newest year: with several years on file, an older row must never win.
  for (const row of currentDashboard(record.dashboard)) {
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
  // Compare like with like: the school's newest year, and the district and state in that same year.
  const year = latestCaasppYear(school) ?? latestCaasppYear(district) ?? latestCaasppYear(state);
  if (!year) return null;
  const [s, d, c] = [school, district, state].map((rows) => caasppForYear(rows, year));
  return {
    year,
    ela: {
      school: allGradesMetAndAbove(s, "ela"),
      district: allGradesMetAndAbove(d, "ela"),
      state: allGradesMetAndAbove(c, "ela"),
    },
    math: {
      school: allGradesMetAndAbove(s, "math"),
      district: allGradesMetAndAbove(d, "math"),
      state: allGradesMetAndAbove(c, "math"),
    },
  };
}

/**
 * A stored record as a page needs it: the newest year in `dashboard` and
 * `caaspp`, every year in `history`, and the test score comparison. Both
 * backends build details through here so they cannot disagree.
 */
export function toDetail(
  record: SchoolRecord,
  district: CaasppResult[],
  state: CaasppResult[],
): SchoolDetail {
  const isPrivate = record.school.type === "private";
  return {
    ...record,
    dashboard: currentDashboard(record.dashboard),
    caaspp: currentCaaspp(record.caaspp),
    caasppComparison: isPrivate ? null : buildComparison(record.caaspp, district, state),
    history: {
      dashboard: [...record.dashboard].sort(
        (a, b) => a.year - b.year || a.indicator.localeCompare(b.indicator),
      ),
      caaspp: [...caasppHistory(record.caaspp, "ela"), ...caasppHistory(record.caaspp, "math")],
    },
  };
}
