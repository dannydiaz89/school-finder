import { isZipOnly, locatePlace } from "./places";
import { z } from "zod";
import { CensusGeocodeResponse, GeocodeResult } from "@/lib/schemas";

/**
 * Address to coordinates through the US Census Bureau geocoder. Plain
 * function with the fetch implementation injected so it runs in a route
 * handler, in a server component, and in a unit test with a stub.
 *
 * Results are cached in memory per process keyed by the normalized query.
 * TODO(data): move the cache to the Convex `geocodeCache` table once the
 * Data workstream lands it, so Vercel instances share hits.
 *
 * Nothing here logs the query: an address is personal data.
 */

export const GeocodeQuery = z.string().trim().min(3).max(200);

export const CENSUS_ONELINE_URL =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

const DEFAULT_TIMEOUT_MS = 8_000;

export class GeocodeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

export interface GeocodeOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Bypass and do not fill the in-memory cache; tests use it. */
  cache?: boolean;
}

const cache = new Map<string, GeocodeResult | null>();

/** Lowercase, single-spaced, so "1420 J St" and " 1420  j st " share an entry. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function censusUrl(query: string): string {
  const url = new URL(CENSUS_ONELINE_URL);
  url.searchParams.set("address", query);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  return url.toString();
}

/**
 * Returns the first match, or `null` when the geocoder knows no such
 * address. Throws `GeocodeError` on a network failure, a timeout, a non-2xx
 * status, or a response that does not fit `CensusGeocodeResponse`.
 */
export async function geocodeAddress(
  rawQuery: string,
  options: GeocodeOptions = {},
): Promise<GeocodeResult | null> {
  const query = GeocodeQuery.parse(rawQuery);
  // A city or ZIP code resolves from the bundled table: instant, and the Census
  // geocoder only understands street addresses anyway.
  const place = locatePlace(query);
  if (place) {
    return {
      query,
      matchedAddress: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      state: "CA",
      kind: place.kind,
    };
  }
  // A ZIP code that is not in California's table is simply not found; the street
  // geocoder cannot resolve a bare ZIP code, so do not ask it.
  if (isZipOnly(query)) return null;
  const key = normalizeQuery(query);
  const useCache = options.cache ?? true;
  if (useCache && cache.has(key)) return cache.get(key) ?? null;

  const doFetch = options.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let body: unknown;
  try {
    const response = await doFetch(censusUrl(query), {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new GeocodeError(`geocoder responded ${response.status}`);
    body = await response.json();
  } catch (error) {
    if (error instanceof GeocodeError) throw error;
    throw new GeocodeError("geocoder request failed", error);
  } finally {
    clearTimeout(timer);
  }

  const parsed = CensusGeocodeResponse.safeParse(body);
  if (!parsed.success) throw new GeocodeError("geocoder response did not match the schema");

  const match = parsed.data.result.addressMatches[0];
  const result: GeocodeResult | null = match
    ? GeocodeResult.parse({
        query,
        matchedAddress: match.matchedAddress,
        latitude: match.coordinates.y,
        longitude: match.coordinates.x,
        state: match.addressComponents?.state,
      })
    : null;

  if (useCache) cache.set(key, result);
  return result;
}

/** Test helper. */
export function clearGeocodeCacheForTests() {
  cache.clear();
}
