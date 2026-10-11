import { haversineMeters } from "@/lib/domain/geo";
import { levelRank } from "@/lib/domain/levels";
import type {
  CaasppSubject,
  CdsCode,
  Coordinates,
  DashboardIndicatorId,
  SchoolDetail,
} from "@/lib/schemas";
import { dashboardIndicator, isPublic, studentTeacherRatio, testScore } from "./facts";

/**
 * Best-in-row logic for the compare table. Pure, no React.
 *
 * A row is comparable when a higher or lower value is plainly better:
 * Dashboard level (higher), test scores (higher), student-teacher ratio
 * (lower), distance from home (lower). Enrollment, meals, English learners,
 * grades, and programs are facts without a direction and are never
 * emphasized. Ties are all emphasized. A row needs at least two comparable
 * values before anything is "best": one value alone is not a comparison.
 */

export type ComparableRow =
  | { kind: "distance" }
  | { kind: "dashboard"; indicator: DashboardIndicatorId }
  | { kind: "test"; subject: CaasppSubject }
  | { kind: "studentTeacher" };

export type Direction = "highest" | "lowest";

export const ROW_DIRECTION: Record<ComparableRow["kind"], Direction> = {
  distance: "lowest",
  dashboard: "highest",
  test: "highest",
  studentTeacher: "lowest",
};

/** Great-circle distance from home, or null when either side has no coordinates. */
export function distanceMeters(school: SchoolDetail, home: Coordinates | undefined): number | null {
  const coords = school.school.coordinates;
  if (!home || !coords) return null;
  return haversineMeters(home, coords);
}

/** 1 (red) to 5 (blue), or null for private schools, a missing indicator, or no level. */
export function dashboardLevelRank(
  school: SchoolDetail,
  indicator: DashboardIndicatorId,
): number | null {
  if (!isPublic(school)) return null;
  const row = dashboardIndicator(school, indicator);
  if (!row || row.level === null) return null;
  return levelRank(row.level);
}

/** The number a row compares for one school, or null when the school has none. */
export function rowValue(
  school: SchoolDetail,
  row: ComparableRow,
  home?: Coordinates,
): number | null {
  switch (row.kind) {
    case "distance":
      return distanceMeters(school, home);
    case "dashboard":
      return dashboardLevelRank(school, row.indicator);
    case "test":
      return isPublic(school) ? testScore(school, row.subject) : null;
    case "studentTeacher":
      return studentTeacherRatio(school);
  }
}

/**
 * Indexes holding the best value. Empty when fewer than two values are
 * present, so a lone value is never bolded. Ties return every index.
 */
export function bestIndexes(
  values: readonly (number | null | undefined)[],
  direction: Direction,
): number[] {
  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length < 2) return [];
  const best = direction === "highest" ? Math.max(...present) : Math.min(...present);
  return values.flatMap((v, i) => (v === best ? [i] : []));
}

/** CDS codes of the schools to emphasize in one row. */
export function bestInRow(
  schools: readonly SchoolDetail[],
  row: ComparableRow,
  home?: Coordinates,
): Set<CdsCode> {
  const values = schools.map((school) => rowValue(school, row, home));
  const indexes = bestIndexes(values, ROW_DIRECTION[row.kind]);
  return new Set(indexes.map((i) => schools[i].school.cds));
}
