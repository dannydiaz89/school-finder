import type { GradeSpan, School } from "@/lib/schemas";
import { isSpecializedPlacement } from "./filters";
import { gradeIndex } from "./grades";

/**
 * Which schools count as "nearby alternatives" to a school.
 *
 * Distance alone is not enough: the five schools nearest a high school are
 * usually elementary schools, and none of them is an alternative to it. An
 * alternative has to serve the same students, which here means sharing
 * enough of the grade span.
 */

/** Radii tried in turn, in miles. Each is about one and a half times the last. */
export const NEARBY_RADII_MILES = [0.5, 1, 1.5, 2.25, 3.5, 5, 8, 12, 20, 35, 60] as const;

/**
 * Stop widening once this many schools have been read. A school whose grades
 * almost nothing nearby shares would otherwise read a whole metro area to fill
 * its list; past this point a short list is the honest answer.
 */
export const NEARBY_MAX_EXAMINED = 1500;

const size = (span: GradeSpan) => gradeIndex(span.high) - gradeIndex(span.low) + 1;

/** How many grades two spans have in common. */
export function sharedGrades(a: GradeSpan, b: GradeSpan): number {
  const low = Math.max(gradeIndex(a.low), gradeIndex(b.low));
  const high = Math.min(gradeIndex(a.high), gradeIndex(b.high));
  return Math.max(0, high - low + 1);
}

/**
 * True when two schools serve largely the same grades: they share at least
 * half the grades of whichever span is narrower.
 *
 * A 9-12 school and a 6-12 school share all four of the narrower span, so
 * they are alternatives, as are K-5 and K-8. A K-6 school and a 6-8 school
 * share only grade 6 of three, so they are not: one feeds the other.
 */
export function servesSameGrades(a: GradeSpan, b: GradeSpan): boolean {
  return sharedGrades(a, b) * 2 >= Math.min(size(a), size(b));
}

const spanOf = (school: School) => school.gradesServed ?? school.gradesOffered;

/**
 * True when `candidate` belongs in the nearby list of `school`: another
 * school, an ordinary choice rather than a placement, serving the same
 * grades. When the school's own span is unknown there is nothing to match
 * on, so distance decides alone.
 */
export function isAlternativeTo(school: School, candidate: School): boolean {
  if (candidate.cds === school.cds || isSpecializedPlacement(candidate)) return false;
  const span = spanOf(school);
  if (!span) return true;
  const other = spanOf(candidate);
  return other !== undefined && servesSameGrades(span, other);
}
