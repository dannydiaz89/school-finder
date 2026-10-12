import type { useTranslations } from "next-intl";
import { gradeKey } from "@/lib/labels";
import type { GradeSpan } from "@/lib/schemas";

type Common = ReturnType<typeof useTranslations<"common">>;
type Labels = ReturnType<typeof useTranslations<"labels">>;

/**
 * A grade span as text: "K–6", or just "K" when the span is one grade.
 * Takes the translators from the calling component so it works in server
 * and client components alike. Every row, card, and table uses this one.
 */
export function gradeSpanText(common: Common, labels: Labels, span: GradeSpan): string {
  const low = labels(gradeKey(span.low));
  const high = labels(gradeKey(span.high));
  return span.low === span.high ? low : common("gradeSpan", { low, high });
}
