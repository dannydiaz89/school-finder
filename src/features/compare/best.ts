import { maintainedBand } from "@/lib/domain/bands";
import { formatMiles, haversineMeters } from "@/lib/domain/geo";
import { statusUnit } from "@/lib/domain/history";
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
 * emphasized.
 *
 * Three rules keep the mark honest:
 *
 * 1. A lead has to be clear. Values closer than the row's margin count as
 *    the same, so 73% beside 74% marks nothing. Every value within the
 *    margin of the best is marked, unless that is all of them.
 * 2. A Dashboard row is marked only when color and number agree. The state's
 *    color weighs this year's result together with its change from last
 *    year, so a school can hold the better color with the weaker number. In
 *    that case the row says nothing about "best" and nothing is marked.
 * 3. One value alone is not a comparison: a row needs two.
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

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/**
 * How far apart two values must be before one is called better. Test scores
 * use the Dashboard's band for percent-of-students measures. Ratio and
 * distance are this app's own choices: one student per teacher, and a
 * quarter mile.
 */
export const ROW_MARGIN: Record<Exclude<ComparableRow["kind"], "dashboard">, number> = {
  distance: 0.25,
  test: 2,
  studentTeacher: 1,
};

/**
 * Indexes to emphasize in a Dashboard row.
 *
 * Schools on the highest color lead. Among them the number decides, when it
 * differs by at least the state's own "Maintained" band. A leader is dropped
 * when a school on a lower color has a clearly better number, because then
 * color and number disagree about which is better.
 */
export function bestDashboardIndexes(
  schools: readonly SchoolDetail[],
  indicator: DashboardIndicatorId,
): number[] {
  const sign = LOWER_IS_BETTER.has(indicator) ? -1 : 1;
  const rated = schools.flatMap((school, index) => {
    if (!isPublic(school)) return [];
    const row = dashboardIndicator(school, indicator);
    if (!row || row.level === null) return [];
    return [
      {
        index,
        rank: levelRank(row.level),
        /** Larger is better, whatever the indicator. */
        value: row.status === null ? null : sign * row.status,
        unit: statusUnit(indicator, row.year),
        year: row.year,
      },
    ];
  });
  if (rated.length < 2) return [];
  // Points in one year and a percent in another are not the same measure.
  if (new Set(rated.map((r) => r.unit)).size > 1) return [];

  const margin = maintainedBand(indicator, rated[0].year);
  const clearlyBetter = (a: number | null, b: number | null) =>
    a !== null && b !== null && oneDecimal(a - b) >= margin;

  const top = Math.max(...rated.map((r) => r.rank));
  const leaders = rated.filter((r) => r.rank === top);
  const others = rated.filter((r) => r.rank < top);

  const winners = leaders.filter(
    (leader) =>
      !leaders.some((other) => clearlyBetter(other.value, leader.value)) &&
      !others.some((other) => clearlyBetter(other.value, leader.value)),
  );
  // Same color everywhere and no number stands out: nothing is best.
  if (others.length === 0 && winners.length === leaders.length) return [];
  return winners.map((w) => w.index);
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
      // The level only; see bestDashboardIndexes for how a row is decided.
      return dashboardLevelRank(school, row.indicator);
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
 * Indexes holding the best value, and any value closer to it than `margin`.
 * Empty when fewer than two values are present, so a lone value is never
 * emphasized, and empty when every value qualifies, because then nothing
 * stands out.
 */
export function bestIndexes(
  values: readonly (number | null | undefined)[],
  direction: Direction,
  margin = 0,
): number[] {
  const isValue = (v: number | null | undefined): v is number =>
    typeof v === "number" && Number.isFinite(v);
  const present = values.filter(isValue);
  if (present.length < 2) return [];
  const best = direction === "highest" ? Math.max(...present) : Math.min(...present);
  const near = (v: number) => (margin > 0 ? oneDecimal(Math.abs(v - best)) < margin : v === best);
  const indexes = values.flatMap((v, i) => (isValue(v) && near(v) ? [i] : []));
  return indexes.length === present.length ? [] : indexes;
}

/** CDS codes of the schools to emphasize in one row. */
export function bestInRow(
  schools: readonly SchoolDetail[],
  row: ComparableRow,
  home?: Coordinates,
): Set<CdsCode> {
  const indexes =
    row.kind === "dashboard"
      ? bestDashboardIndexes(schools, row.indicator)
      : bestIndexes(
          schools.map((school) => rowValue(school, row, home)),
          ROW_DIRECTION[row.kind],
          ROW_MARGIN[row.kind],
        );
  return new Set(indexes.map((i) => schools[i].school.cds));
}
