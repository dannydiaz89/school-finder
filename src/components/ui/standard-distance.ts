import type { useTranslations } from "next-intl";

type Labels = ReturnType<typeof useTranslations<"labels">>;

/**
 * A distance from the state standard, in words: "41.9 pts below standard".
 *
 * English and math results on the Dashboard are the average number of points
 * students scored above or below the "met standard" line. Printed as a signed
 * number, "-41.9 pts" reads as a drop of 41.9, especially beside a line that
 * says the result increased. Always say which side of the standard it is.
 *
 * `short` drops the word "standard" for tight columns whose heading or note
 * already says what the points measure.
 */
export function standardDistanceText(
  labels: Labels,
  status: number,
  form: "long" | "short" = "long",
): string {
  if (status === 0) return labels("standard.at");
  const points = Math.abs(status);
  if (form === "short") {
    return status > 0
      ? labels("standard.aboveShort", { points })
      : labels("standard.belowShort", { points });
  }
  return status > 0 ? labels("standard.above", { points }) : labels("standard.below", { points });
}
