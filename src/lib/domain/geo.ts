import type { Coordinates } from "@/lib/schemas";

const EARTH_RADIUS_METERS = 6_371_008.8;
export const METERS_PER_MILE = 1609.344;

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

/** Great-circle distance in meters. Accurate to well under 0.5% for city-scale distances. */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Latitude/longitude box that contains every point within `radiusMeters` of `center`. */
export function boundingBox(center: Coordinates, radiusMeters: number): BoundingBox {
  const dLat = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const dLng = cosLat > 1e-9 ? dLat / cosLat : 180;
  return {
    north: Math.min(90, center.latitude + dLat),
    south: Math.max(-90, center.latitude - dLat),
    east: Math.min(180, center.longitude + dLng),
    west: Math.max(-180, center.longitude - dLng),
  };
}

/** Round to one decimal mile for display, never below 0.1. */
export function formatMiles(meters: number): number {
  return Math.max(0.1, Math.round(metersToMiles(meters) * 10) / 10);
}
