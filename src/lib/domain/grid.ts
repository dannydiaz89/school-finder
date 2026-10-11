import type { Coordinates } from "@/lib/schemas";

/**
 * A plain latitude/longitude grid for radius search. Every school is filed
 * under the cell that contains it; a search reads the cells that touch its
 * circle. With an index on (row, col) that is one range read per grid row.
 *
 * Deliberately simple so any database can do it: Convex today, and a
 * `WHERE geo_row = ? AND geo_col BETWEEN ? AND ?` in Postgres tomorrow.
 */

/** Cell size in degrees. 0.02° is about 2.2 km north-south, 1.8 km east-west in California. */
export const CELL_DEGREES = 0.02;

/** Meters per degree of latitude on the same sphere `haversineMeters` uses. */
const METERS_PER_DEGREE_LAT = (Math.PI / 180) * 6_371_008.8;

/**
 * The spans are computed with flat-earth arithmetic, which drifts from the
 * great-circle distance by a fraction of a percent at 25 miles. Padding the
 * radius keeps the rim covered; the exact distance check discards the extra.
 */
const pad = (radiusMeters: number) => radiusMeters * 1.005 + 25;

export interface Cell {
  row: number;
  col: number;
}

/** One grid row and the inclusive span of columns a search must read in it. */
export interface RowRange {
  row: number;
  colMin: number;
  colMax: number;
}

const rowOf = (latitude: number) => Math.floor((latitude + 90) / CELL_DEGREES);
const colOf = (longitude: number) => Math.floor((longitude + 180) / CELL_DEGREES);

export function cellOf(point: Coordinates): Cell {
  return { row: rowOf(point.latitude), col: colOf(point.longitude) };
}

/**
 * The grid rows and column spans that cover a circle. Each row's span follows
 * the circle's width at that latitude rather than the bounding box, so the
 * corners are not read. Spans err slightly wide; callers still check the exact
 * distance of every school returned.
 */
export function rowRanges(center: Coordinates, exactRadiusMeters: number): RowRange[] {
  const radiusMeters = pad(exactRadiusMeters);
  const radiusLat = radiusMeters / METERS_PER_DEGREE_LAT;
  const south = Math.max(-90, center.latitude - radiusLat);
  const north = Math.min(90, center.latitude + radiusLat);
  const ranges: RowRange[] = [];
  for (let row = rowOf(south); row <= rowOf(north); row += 1) {
    const bandSouth = row * CELL_DEGREES - 90;
    const bandNorth = bandSouth + CELL_DEGREES;
    // North-south gap between the center and this band; zero when the center is inside it.
    const gapDegrees = Math.max(0, bandSouth - center.latitude, center.latitude - bandNorth);
    const gapMeters = gapDegrees * METERS_PER_DEGREE_LAT;
    if (gapMeters > radiusMeters) continue;
    const halfWidthMeters = Math.sqrt(radiusMeters ** 2 - gapMeters ** 2);
    // A degree of longitude is shortest at the band edge farthest from the equator; using it
    // keeps the span wide enough everywhere in the band.
    const farLatitude = Math.max(Math.abs(bandSouth), Math.abs(bandNorth));
    const cosine = Math.max(0.01, Math.cos((farLatitude * Math.PI) / 180));
    const halfWidthDegrees = halfWidthMeters / (METERS_PER_DEGREE_LAT * cosine);
    ranges.push({
      row,
      colMin: colOf(Math.max(-180, center.longitude - halfWidthDegrees)),
      colMax: colOf(Math.min(180, center.longitude + halfWidthDegrees)),
    });
  }
  return ranges;
}
