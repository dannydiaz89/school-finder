import type { DashboardIndicatorId } from "@/lib/schemas";
import { statusUnit } from "./history";

/**
 * The Dashboard calls a year-over-year change smaller than these "Maintained".
 * They are the state's own line between a real difference and noise, so the
 * app uses them wherever it has to decide whether two values differ.
 *
 * Checked against the 2025 files: for every indicator the largest change
 * labeled Maintained is just under the band and the smallest labeled
 * Increased or Declined is exactly on it.
 */
const MAINTAINED_BAND: Record<DashboardIndicatorId, number> = {
  ela: 3,
  math: 3,
  chronicAbsenteeism: 0.5,
  suspension: 0.3,
  graduation: 1,
  collegeCareer: 2,
  elpi: 2,
  science: 2,
};

/** Distance-from-standard measures use the 3-point band, whatever the indicator. */
const POINTS_BAND = 3;

/** The smallest difference in `status` worth calling a difference, in the indicator's own unit. */
export function maintainedBand(indicator: DashboardIndicatorId, year: number): number {
  return statusUnit(indicator, year) === "points" ? POINTS_BAND : MAINTAINED_BAND[indicator];
}

export type ChangeKind = "increased" | "declined" | "maintained";

/**
 * How the Dashboard would name a year-over-year change: "Maintained" inside
 * the band, otherwise by the sign of the change. Null when there is no change
 * on file. Lets a row say "Maintained" from the number alone, without the
 * file's change-level code.
 */
export function changeKind(
  indicator: DashboardIndicatorId,
  year: number,
  change: number | null | undefined,
): ChangeKind | null {
  if (change === null || change === undefined) return null;
  if (Math.round(Math.abs(change) * 10) / 10 < maintainedBand(indicator, year)) return "maintained";
  return change > 0 ? "increased" : "declined";
}
