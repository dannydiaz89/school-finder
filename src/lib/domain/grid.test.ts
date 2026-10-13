import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import { haversineMeters, milesToMeters } from "./geo";
import { CELL_DEGREES, cellOf, ringRanges, rowRanges } from "./grid";

const sacramento = { latitude: 38.5816, longitude: -121.4944 };
const losAngeles = { latitude: 34.0522, longitude: -118.2437 };

const covered = (
  point: { latitude: number; longitude: number },
  ranges: ReturnType<typeof rowRanges>,
) => {
  const cell = cellOf(point);
  return ranges.some((r) => r.row === cell.row && cell.col >= r.colMin && cell.col <= r.colMax);
};

describe("cellOf", () => {
  it("files nearby points in the same cell and distant points in different ones", () => {
    const a = cellOf(sacramento);
    expect(
      cellOf({ latitude: sacramento.latitude + 0.001, longitude: sacramento.longitude }),
    ).toEqual(a);
    expect(cellOf(losAngeles)).not.toEqual(a);
  });
});

describe("rowRanges", () => {
  it.each([0.25, 1, 3, 10, 25])("covers every point within %s miles", (miles) => {
    const radius = milesToMeters(miles);
    for (const center of [sacramento, losAngeles, { latitude: 41.9, longitude: -124.2 }]) {
      const ranges = rowRanges(center, radius);
      // Sample the disc densely, including its rim.
      for (let bearing = 0; bearing < 360; bearing += 5) {
        for (const fraction of [0.1, 0.5, 0.9, 0.999]) {
          const d = (radius * fraction) / 111_320;
          const rad = (bearing * Math.PI) / 180;
          const point = {
            latitude: center.latitude + d * Math.cos(rad),
            longitude:
              center.longitude + (d * Math.sin(rad)) / Math.cos((center.latitude * Math.PI) / 180),
          };
          if (haversineMeters(center, point) <= radius) expect(covered(point, ranges)).toBe(true);
        }
      }
    }
  });

  it("finds exactly the fixture schools a brute-force distance check finds", () => {
    for (const miles of [1, 3, 4]) {
      const radius = milesToMeters(miles);
      const ranges = rowRanges(sacramento, radius);
      const located = fixtures.schools.filter((r) => r.school.coordinates);
      const brute = located.filter(
        (r) => haversineMeters(sacramento, r.school.coordinates!) <= radius,
      );
      const viaGrid = located.filter(
        (r) =>
          covered(r.school.coordinates!, ranges) &&
          haversineMeters(sacramento, r.school.coordinates!) <= radius,
      );
      expect(viaGrid.map((r) => r.school.cds).sort()).toEqual(
        brute.map((r) => r.school.cds).sort(),
      );
      expect(brute.length).toBeGreaterThan(0);
    }
  });

  it("reads few rows for a small search and stays tight to the circle", () => {
    const small = rowRanges(sacramento, milesToMeters(3));
    expect(small.length).toBeLessThanOrEqual(7);
    const big = rowRanges(losAngeles, milesToMeters(25));
    expect(big.length).toBeLessThanOrEqual(40);
    // Cells read versus the bounding box of the same circle: the corners are skipped.
    const cells = big.reduce((n, r) => n + (r.colMax - r.colMin + 1), 0);
    const box = big.length * Math.max(...big.map((r) => r.colMax - r.colMin + 1));
    expect(cells / box).toBeLessThan(0.9);
    expect(CELL_DEGREES).toBe(0.02);
  });
});

describe("ringRanges", () => {
  const center = { latitude: 33.9637, longitude: -118.264 }; // South Los Angeles
  const cells = (ranges: ReturnType<typeof rowRanges>) =>
    ranges.flatMap((r) =>
      Array.from({ length: r.colMax - r.colMin + 1 }, (_, i) => `${r.row}:${r.colMin + i}`),
    );

  it("adds exactly the cells the wider circle needs, each once", () => {
    const radii = [0.5, 1, 1.5, 2.25, 3.5, 5, 8].map(milesToMeters);
    const seen: string[] = cells(rowRanges(center, radii[0]));
    for (let i = 1; i < radii.length; i += 1) {
      const ring = cells(ringRanges(center, radii[i - 1], radii[i]));
      // Nothing read at an earlier step is read again.
      expect(ring.filter((cell) => seen.includes(cell))).toEqual([]);
      seen.push(...ring);
      // Together the steps cover the circle exactly as a single search would.
      expect([...seen].sort()).toEqual(cells(rowRanges(center, radii[i])).sort());
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("is empty when the wider circle needs no new cells", () => {
    expect(ringRanges(center, milesToMeters(2), milesToMeters(2))).toEqual([]);
  });
});
