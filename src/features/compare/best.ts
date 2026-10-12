import { formatMiles, haversineMeters } from "@/lib/domain/geo";
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
 * emphasized. Dashboard rows compare the level, then the measure behind it.
 * Values that print the same are a tie, and ties are all emphasized. A row
 * needs at least two comparable values before anything is "best": one value
 * alone is not a comparison.
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

/** Indicators where a smaller number is the better one. For the rest, larger is better. */
export const LOWER_IS_BETTER: ReadonlySet<DashboardIndicatorId> = new Set([
  "chronicAbsenteeism",
  "suspension",
]);

/** Levels are whole steps; the status only ever decides between schools on the same level. */
const LEVEL_WEIGHT = 1_000_000;
const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/**
 * A single number for a Dashboard cell where larger is better: the state's
 * level first, then the measure behind it. Two Green schools are not equal if
 * one is 12 points above standard and the other 2; the level alone would call
 * that a tie and highlight both, which highlights nothing.
 */
export function dashboardScore(
  school: SchoolDetail,
  indicator: DashboardIndicatorId,
): number | null {
  const rank = dashboardLevelRank(school, indicator);
  if (rank === null) return null;
  const status = dashboardIndicator(school, indicator)?.status;
  if (status === null || status === undefined) return rank * LEVEL_WEIGHT;
  const better = LOWER_IS_BETTER.has(indicator) ? -status : status;
  return rank * LEVEL_WEIGHT + oneDecimal(better);
}

/**
 * The number a row compares for one school, or null when the school has none.
 * Values are rounded the way the table prints them, so two cells that read the
 * same are a tie rather than one being picked over a difference nobody can see.
 */
export function rowValue(
  school: SchoolDetail,
  row: ComparableRow,
  home?: Coordinates,
): number | null {
  switch (row.kind) {
    case "distance": {
      const meters = distanceMeters(school, home);
      return meters === null ? null : formatMiles(meters);
    }
    case "dashboard":
      return dashboardScore(school, row.indicator);
    case "test": {
      const score = isPublic(school) ? testScore(school, row.subject) : null;
      return score === null ? null : Math.round(score);
    }
    case "studentTeacher": {
      const ratio = studentTeacherRatio(school);
      return ratio === null ? null : oneDecimal(ratio);
    }
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
