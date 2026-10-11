import { DASHBOARD_LEVELS, type DashboardLevel } from "@/lib/schemas";

/**
 * Dashboard files encode performance as a color code: 1 Red, 2 Orange,
 * 3 Yellow, 4 Green, 5 Blue, 0 no level. Everything in the app works with the
 * named level; only importers see the number.
 */

export function colorCodeToLevel(code: number | string | null | undefined): DashboardLevel | null {
  const n = typeof code === "string" ? Number(code) : code;
  if (n === null || n === undefined || !Number.isInteger(n) || n < 1 || n > 5) return null;
  return DASHBOARD_LEVELS[n - 1];
}

/** 1 for red through 5 for blue; 0 for no level. Higher is better. */
export function levelRank(level: DashboardLevel | null | undefined): number {
  return level ? DASHBOARD_LEVELS.indexOf(level) + 1 : 0;
}

/** True when `level` is at least as good as `min`. A missing level never qualifies. */
export function meetsMinLevel(
  level: DashboardLevel | null | undefined,
  min: DashboardLevel,
): boolean {
  return levelRank(level) >= levelRank(min);
}
