import {
  DASHBOARD_INDICATORS,
  MAX_COMPARE,
  type CaasppSubject,
  type DashboardIndicator,
  type DashboardIndicatorId,
  type GradeSpan,
  type Program,
  type SchoolDetail,
  type SchoolYear,
} from "@/lib/schemas";

/**
 * Facts the compare table reads off a SchoolDetail. Pure functions, no
 * React, so the table stays a thin renderer and every rule here has a unit
 * test. Nothing is inferred beyond what the source files say: a missing
 * value is `null`, never "No".
 */

export function isPublic(school: SchoolDetail): boolean {
  return school.school.type !== "private";
}

/** The span the directory says is served, falling back to the span offered. */
export function gradeSpan(school: SchoolDetail): GradeSpan | undefined {
  return school.school.gradesServed ?? school.school.gradesOffered;
}

/** The newest Dashboard row for one indicator, or undefined when the school has none. */
export function dashboardIndicator(
  school: SchoolDetail,
  indicator: DashboardIndicatorId,
): DashboardIndicator | undefined {
  return school.dashboard
    .filter((row) => row.indicator === indicator)
    .reduce<DashboardIndicator | undefined>(
      (best, row) => (best === undefined || row.year > best.year ? row : best),
      undefined,
    );
}

/** Newest Dashboard year across the list, or null when no school has Dashboard rows. */
export function dashboardYear(schools: readonly SchoolDetail[]): number | null {
  let year: number | null = null;
  for (const school of schools) {
    for (const row of school.dashboard) {
      year = year === null ? row.year : Math.max(year, row.year);
    }
  }
  return year;
}

/** Indicators any school in the list has a row for, in Dashboard order. */
export function dashboardIndicatorsPresent(
  schools: readonly SchoolDetail[],
): DashboardIndicatorId[] {
  return DASHBOARD_INDICATORS.filter((indicator) =>
    schools.some((school) => dashboardIndicator(school, indicator) !== undefined),
  );
}

/** ELA and Math Dashboard statuses are distance from standard in points; the rest are percentages. */
export function isPointsIndicator(indicator: DashboardIndicatorId): boolean {
  return indicator === "ela" || indicator === "math";
}

/** CAASPP year of the comparisons, or null when no school was tested. */
export function caasppYear(schools: readonly SchoolDetail[]): SchoolYear | null {
  const years = schools
    .map((school) => school.caasppComparison?.year)
    .filter((year): year is SchoolYear => year !== undefined);
  return years.length ? years.sort().at(-1)! : null;
}

/** All-grades percent met-and-above for the school itself, or null when suppressed or untested. */
export function testScore(school: SchoolDetail, subject: CaasppSubject): number | null {
  return school.caasppComparison?.[subject].school ?? null;
}

/**
 * True only when the data shows transitional kindergarten: TK students on
 * Census Day or TK in the served span. False means "not shown", not "no":
 * directory grade spans never list TK, so absence proves nothing.
 */
export function hasTransitionalKindergarten(school: SchoolDetail): boolean {
  const tkCount = school.enrollment?.byGrade.find((g) => g.grade === "TK")?.count ?? 0;
  if (tkCount > 0) return true;
  const span = school.school.gradesServed;
  return span?.low === "TK";
}

/** Directory program flags that are true. Private schools have none. */
export function programs(school: SchoolDetail): Program[] {
  const out: Program[] = [];
  if (school.school.magnet) out.push("magnet");
  if (school.school.multilingual) out.push("multilingual");
  if (school.school.virtual === "F" || school.school.virtual === "V") out.push("virtual");
  return out;
}

/** Census Day total for public schools, affidavit total for private ones. */
export function enrollmentTotal(school: SchoolDetail): number | null {
  return school.enrollment?.total ?? school.privateDetail?.totalEnrollment ?? null;
}

/** English learners as a fraction of enrollment, or null when either number is missing. */
export function englishLearnerFraction(school: SchoolDetail): number | null {
  const total = school.enrollment?.total;
  const learners = school.enrollment?.englishLearners;
  if (!total || learners === undefined) return null;
  return learners / total;
}

export function frpmFraction(school: SchoolDetail): number | null {
  return school.frpm?.pctFrpm ?? null;
}

export function studentTeacherRatio(school: SchoolDetail): number | null {
  return school.staff?.studentTeacherRatio ?? null;
}

/** True when the raw `compare` query value names more distinct codes than the page shows. */
export function exceedsMax(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const distinct = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return distinct.size > MAX_COMPARE;
}
