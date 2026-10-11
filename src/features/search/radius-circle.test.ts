import { describe, expect, it } from "vitest";
import { haversineMeters, milesToMeters } from "@/lib/domain/geo";
import { circlePolygon, destinationPoint } from "./radius-circle";

const sacramento = { latitude: 38.5793, longitude: -121.4904 };

describe("destinationPoint", () => {
  it("moves north by the right distance", () => {
    const p = destinationPoint(sacramento, 1000, 0);
    expect(p.longitude).toBeCloseTo(sacramento.longitude, 6);
    expect(p.latitude).toBeGreaterThan(sacramento.latitude);
    expect(haversineMeters(sacramento, p)).toBeCloseTo(1000, 3);
  });

  it("moves east and wraps longitude across the antimeridian", () => {
    const nearDateLine = { latitude: 0, longitude: 179.99 };
    const p = destinationPoint(nearDateLine, 5000, 90);
    expect(p.longitude).toBeLessThan(-179.9);
    expect(haversineMeters(nearDateLine, p)).toBeCloseTo(5000, 3);
  });
});

describe("circlePolygon", () => {
  const radius = milesToMeters(3);
  const polygon = circlePolygon(sacramento, radius);
  const ring = polygon.coordinates[0];

  it("is a closed GeoJSON polygon with 64 vertices plus the repeated first point", () => {
    expect(polygon.type).toBe("Polygon");
    expect(polygon.coordinates).toHaveLength(1);
    expect(ring).toHaveLength(65);
    expect(ring[64]).toEqual(ring[0]);
  });

  it("puts every vertex exactly the radius from the center, as [lng, lat]", () => {
    for (const [lng, lat] of ring) {
      expect(haversineMeters(sacramento, { latitude: lat, longitude: lng })).toBeCloseTo(radius, 3);
    }
  });

  it("honors a custom step count", () => {
    expect(circlePolygon(sacramento, radius, 8).coordinates[0]).toHaveLength(9);
  });
});
