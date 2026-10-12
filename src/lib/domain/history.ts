import type {
  CaasppResult,
  CaasppSubject,
  DashboardIndicator,
  DashboardIndicatorId,
} from "@/lib/schemas";

/**
 * Several years of the same measure sit side by side in storage. These
 * helpers decide what "current" means and put a history in order, in one
 * place, so no screen can show an old year as today's by accident.
 */

/** The newest Dashboard reporting year among the rows, or null when there are none. */
export function latestDashboardYear(rows: readonly DashboardIndicator[]): number | null {
  return rows.length ? Math.max(...rows.map((row) => row.year)) : null;
}

/**
 * The rows that describe the school now: every indicator from its newest
 * year. An indicator the school had two years ago but not this year is left
 * out rather than shown as current.
 */
export function currentDashboard(rows: readonly DashboardIndicator[]): DashboardIndicator[] {
  const year = latestDashboardYear(rows);
  return year === null ? [] : rows.filter((row) => row.year === year);
}

/** One indicator across the years on file, oldest first. */
export function indicatorHistory(
  rows: readonly DashboardIndicator[],
  indicator: DashboardIndicatorId,
): DashboardIndicator[] {
  return rows.filter((row) => row.indicator === indicator).sort((a, b) => a.year - b.year);
}

/** Every Dashboard year on file, oldest first. */
export function dashboardYears(rows: readonly DashboardIndicator[]): number[] {
  return [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
}

/** School years sort correctly as text: "2022-23" < "2023-24" < "2024-25". */
export function latestCaasppYear(rows: readonly CaasppResult[]): string | null {
  return rows.length ? rows.map((row) => row.year).reduce((a, b) => (a > b ? a : b)) : null;
}

export function currentCaaspp(rows: readonly CaasppResult[]): CaasppResult[] {
  const year = latestCaasppYear(rows);
  return year === null ? [] : rows.filter((row) => row.year === year);
}

/** All-grades results for one subject across the years on file, oldest first. */
export function caasppHistory(
  rows: readonly CaasppResult[],
  subject: CaasppSubject,
): CaasppResult[] {
  return rows
    .filter((row) => row.subject === subject && row.grade === "all")
    .sort((a, b) => a.year.localeCompare(b.year));
}

/** Rows for one school year. */
export function caasppForYear(rows: readonly CaasppResult[], year: string | null): CaasppResult[] {
  return year === null ? [] : rows.filter((row) => row.year === year);
}

/**
 * The first Dashboard year that reports science as the percent of students
 * who met or exceeded standard. The year before, science was a distance
 * from standard in points with no color, so the two cannot be compared.
 */
export const SCIENCE_PERCENT_FROM_YEAR = 2025;

export type StatusUnit = "points" | "percent";

/** The unit of `status` and `change` for an indicator in a given Dashboard year. */
export function statusUnit(indicator: DashboardIndicatorId, year: number): StatusUnit {
  if (indicator === "ela" || indicator === "math") return "points";
  if (indicator === "science" && year < SCIENCE_PERCENT_FROM_YEAR) return "points";
  return "percent";
}

/** Every CAASPP school year on file, oldest first. */
export function caasppYears(rows: readonly CaasppResult[]): string[] {
  return [...new Set(rows.map((row) => row.year))].sort((a, b) => a.localeCompare(b));
}
