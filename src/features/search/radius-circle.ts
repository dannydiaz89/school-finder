import type { Coordinates } from "@/lib/schemas";

/**
 * A circle on the sphere as a GeoJSON polygon, for the dashed radius ring
 * on the map. Points come from the direct (inverse haversine) geodesic
 * formula, so the ring stays round at any latitude instead of flattening
 * the way a plain lat/lng offset would. Pure; no map or turf dependency.
 */

const EARTH_RADIUS_METERS = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Point `distanceMeters` from `from` on bearing `bearingDeg` (0 = north, clockwise). */
export function destinationPoint(
  from: Coordinates,
  distanceMeters: number,
  bearingDeg: number,
): Coordinates {
  const delta = distanceMeters / EARTH_RADIUS_METERS;
  const theta = toRad(bearingDeg);
  const lat1 = toRad(from.latitude);
  const lng1 = toRad(from.longitude);
  const sinLat2 =
    Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(theta);
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)));
  const y = Math.sin(theta) * Math.sin(delta) * Math.cos(lat1);
  const x = Math.cos(delta) - Math.sin(lat1) * sinLat2;
  const lng2 = lng1 + Math.atan2(y, x);
  // Wrap longitude to [-180, 180).
  const longitude = ((toDeg(lng2) + 540) % 360) - 180;
  return { latitude: toDeg(lat2), longitude };
}

/**
 * GeoJSON Polygon (one closed ring of `[lng, lat]` pairs) approximating the
 * circle of `radiusMeters` around `center` with `steps` vertices.
 */
export function circlePolygon(center: Coordinates, radiusMeters: number, steps = 64) {
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const p = destinationPoint(center, radiusMeters, (i * 360) / steps);
    ring.push([p.longitude, p.latitude]);
  }
  ring.push(ring[0]);
  return { type: "Polygon" as const, coordinates: [ring] };
}
