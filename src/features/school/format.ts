import type { useFormatter, useTranslations } from "next-intl";

/**
 * Small formatting helpers shared by the detail sections. They take the
 * translator and formatter from the calling component so they work in
 * server and client components alike.
 */

type Common = ReturnType<typeof useTranslations<"common">>;
type Formatter = ReturnType<typeof useFormatter>;

export { gradeSpanText } from "@/components/ui/grade-span";

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
