import { GRADES, type Grade, type GradeBand, type GradeSpan } from "@/lib/schemas";

/**
 * Grade spans as CDE publishes them: "K-6", "P-5", "9-12", "K", "P", "Adult".
 * Grade bands are what the Grades filter offers a parent.
 */

export function gradeIndex(grade: Grade): number {
  return GRADES.indexOf(grade);
}

const ALIASES: Record<string, Grade> = {
  P: "P",
  PS: "P",
  TK: "TK",
  K: "K",
  KN: "K",
  ADULT: "A",
  A: "A",
};

function parseGrade(token: string): Grade | undefined {
  const t = token.trim().toUpperCase();
  if (t in ALIASES) return ALIASES[t];
  const n = Number(t);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return String(n) as Grade;
  return undefined;
}

/** "K-6" -> { low: "K", high: "6" }. Returns undefined for blank, "No", or unparseable text. */
export function parseGradeSpan(text: string | undefined | null): GradeSpan | undefined {
  if (!text) return undefined;
  const parts = text
    .split(/[-–]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return undefined;
  const low = parseGrade(parts[0]);
  const high = parts.length === 2 ? parseGrade(parts[1]) : low;
  if (!low || !high) return undefined;
  if (gradeIndex(low) > gradeIndex(high)) return undefined;
  return { low, high };
}

export function spanIncludes(span: GradeSpan, grade: Grade): boolean {
  const i = gradeIndex(grade);
  return gradeIndex(span.low) <= i && i <= gradeIndex(span.high);
}

/** Grade bands the filter offers. TK–K is its own band because many parents start there. */
export const GRADE_BANDS: Record<GradeBand, GradeSpan> = {
  tk: { low: "TK", high: "K" },
  elementary: { low: "K", high: "5" },
  middle: { low: "6", high: "8" },
  high: { low: "9", high: "12" },
};

/** True when any grade in the band is inside the school's span. */
export function spanOverlapsBand(span: GradeSpan, band: GradeBand): boolean {
  const b = GRADE_BANDS[band];
  return gradeIndex(span.low) <= gradeIndex(b.high) && gradeIndex(b.low) <= gradeIndex(span.high);
}

/** "K-6" for display is rendered by the UI with the label layer; this gives the two endpoints. */
export function spanEndpoints(span: GradeSpan): [Grade, Grade] {
  return [span.low, span.high];
}

/** Grades the enrollment files count. Preschool and adult programs are not in them. */
const COUNTED: readonly Grade[] = [
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

/**
 * Narrow a listed grade span to the grades that have students.
 *
 * The state directory's grade span is self-reported and wrong at the edges
 * for about 4% of schools: Downey High is listed as 8-12 with no 8th graders
 * among 4,051 students, Vacaville High as 4-12 with everyone in 9-12. Census
 * Day enrollment by grade is the better evidence, so grades at either end of
 * the listed span with no students are dropped.
 *
 * It only ever trims. It never widens a span (one stray student in a grade is
 * not a grade the school offers), never trims preschool or adult ends (the
 * enrollment files do not count them), and leaves the span alone when the
 * school has no counted students at all.
 */
export function trimSpanToEnrollment(
  span: GradeSpan,
  byGrade: readonly { grade: Grade; count: number }[],
): GradeSpan {
  const has = new Set(byGrade.filter((g) => g.count > 0).map((g) => g.grade));
  // Transitional kindergarten is part of kindergarten in a directory span.
  if (has.has("TK")) has.add("K");
  const inSpan = COUNTED.filter((g) => spanIncludes(span, g));
  const withStudents = inSpan.filter((g) => has.has(g));
  if (withStudents.length === 0) return span;
  const low = COUNTED.includes(span.low) ? withStudents[0] : span.low;
  const high = COUNTED.includes(span.high) ? withStudents[withStudents.length - 1] : span.high;
  return low === span.low && high === span.high ? span : { low, high };
}

/**
 * The span to show for a school: the listed span trimmed to grades with
 * students, starting at TK when transitional kindergarten students are
 * enrolled. The state directory never lists TK, so without this a school
 * with a TK class reads "K-5" beside "Transitional kindergarten: Yes".
 *
 * Returns the same object when nothing changes.
 */
export function servedSpan(
  listed: GradeSpan,
  byGrade: readonly { grade: Grade; count: number }[],
): GradeSpan {
  const trimmed = trimSpanToEnrollment(listed, byGrade);
  const hasTk = byGrade.some((g) => g.grade === "TK" && g.count > 0);
  return hasTk && trimmed.low === "K" ? { low: "TK", high: trimmed.high } : trimmed;
}

/**
 * True when two spans are the same once TK is read as kindergarten. The
 * directory cannot say TK, so "TK-5 served, K-5 listed" is not a disagreement.
 */
export function sameSpanIgnoringTk(a: GradeSpan, b: GradeSpan): boolean {
  const low = (g: Grade) => (g === "TK" ? "K" : g);
  return low(a.low) === low(b.low) && a.high === b.high;
}
