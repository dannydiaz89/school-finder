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
