import { describe, expect, it } from "vitest";
import { boundingBox, formatMiles, haversineMeters, milesToMeters } from "./geo";

const sacramento = { latitude: 38.5816, longitude: -121.4944 };
const sanFrancisco = { latitude: 37.7749, longitude: -122.4194 };

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters(sacramento, sacramento)).toBe(0);
  });

  it("matches the known Sacramento to San Francisco distance within 1%", () => {
    const meters = haversineMeters(sacramento, sanFrancisco);
    expect(meters).toBeGreaterThan(120_000);
    expect(meters).toBeLessThan(122_000);
  });

  it("is symmetric", () => {
    expect(haversineMeters(sacramento, sanFrancisco)).toBeCloseTo(
      haversineMeters(sanFrancisco, sacramento),
      6,
    );
  });
});

describe("boundingBox", () => {
  it("contains every point on the radius circle", () => {
    const radius = milesToMeters(3);
    const box = boundingBox(sacramento, radius);
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const dLat = (radius / 6_371_008.8) * (180 / Math.PI);
      const dLng = dLat / Math.cos((sacramento.latitude * Math.PI) / 180);
      const p = {
        latitude: sacramento.latitude + dLat * Math.cos(rad),
        longitude: sacramento.longitude + dLng * Math.sin(rad),
      };
      expect(p.latitude).toBeLessThanOrEqual(box.north + 1e-9);
      expect(p.latitude).toBeGreaterThanOrEqual(box.south - 1e-9);
      expect(p.longitude).toBeLessThanOrEqual(box.east + 1e-9);
      expect(p.longitude).toBeGreaterThanOrEqual(box.west - 1e-9);
    }
  });
});

describe("formatMiles", () => {
  it("rounds to a tenth and never shows zero", () => {
    expect(formatMiles(milesToMeters(0.94))).toBe(0.9);
    expect(formatMiles(10)).toBe(0.1);
  });
});
