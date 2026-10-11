import type { useFormatter, useTranslations } from "next-intl";
import { gradeKey } from "@/lib/labels";
import type { GradeSpan } from "@/lib/schemas";

/**
 * Small formatting helpers shared by the detail sections. They take the
 * translator and formatter from the calling component so they work in
 * server and client components alike.
 */

type Common = ReturnType<typeof useTranslations<"common">>;
type Labels = ReturnType<typeof useTranslations<"labels">>;
type Formatter = ReturnType<typeof useFormatter>;

/** "K–6", or just "K" when the span is one grade. */
export function gradeSpanText(common: Common, labels: Labels, span: GradeSpan): string {
  const low = labels(gradeKey(span.low));
  const high = labels(gradeKey(span.high));
  return span.low === span.high ? low : common("gradeSpan", { low, high });
}

/** Join non-empty parts with the locale's separator ("a · b · c"). */
export function joinParts(common: Common, parts: Array<string | null | undefined>): string {
  const present = parts.filter((p): p is string => Boolean(p));
  return present.length ? present.reduce((a, b) => common("join", { a, b })) : "";
}

/** 0.301 -> "30%". Whole percents for bars and stats. */
export function percent(format: Formatter, fraction: number): string {
  return format.number(fraction, { style: "percent", maximumFractionDigits: 0 });
}

/** `part` of `whole` as a fraction, or null when the whole is zero. */
export function share(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}
