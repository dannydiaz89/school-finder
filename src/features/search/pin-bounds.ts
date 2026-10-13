import type { Coordinates } from "@/lib/schemas";

export interface Box {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** The view when there is nothing to frame: the whole state. */
export const CALIFORNIA: Box = { west: -124.6, south: 32.4, east: -114.0, north: 42.1 };

/** About a mile and a half. A lone pin, or schools sharing a campus, still get some map around them. */
const MIN_SPAN_DEGREES = 0.04;

/**
 * The box a map should show to frame a set of points, for results that
 * have no search center: schools found by name can be anywhere in the state.
 */
export function boundsOf(points: readonly Coordinates[]): Box {
  if (points.length === 0) return CALIFORNIA;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const { latitude, longitude } of points) {
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  const widen = (low: number, high: number): [number, number] => {
    const missing = MIN_SPAN_DEGREES - (high - low);
    return missing > 0 ? [low - missing / 2, high + missing / 2] : [low, high];
  };
  [west, east] = widen(west, east);
  [south, north] = widen(south, north);
  return { west, south, east, north };
}
