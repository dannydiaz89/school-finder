import data from "./places.json";

/**
 * Resolve a California city, community, or ZIP code to its center point from
 * the bundled Census Gazetteer table. No network call, so it is instant, and
 * it covers what the street-address geocoder cannot: "Sacramento", "95816".
 *
 * Returns null for anything that is not exactly a known place or ZIP code,
 * so the caller can fall back to geocoding a street address.
 */

export interface PlaceMatch {
  kind: "city" | "zip";
  /** Display name: "Sacramento, CA" or "95816". */
  label: string;
  latitude: number;
  longitude: number;
}

const places = data.places as unknown as [name: string, lat: number, lng: number][];
const zips = data.zips as unknown as Record<string, [lat: number, lng: number]>;

/** Lowercase, no accents, punctuation as spaces: "La Cañada-Flintridge" -> "la canada flintridge". */
export function normalizePlaceName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let index: Map<string, [string, number, number]> | undefined;

function placeIndex() {
  if (index) return index;
  index = new Map();
  for (const place of places) {
    const [name] = place;
    // "San Buenaventura (Ventura)" is findable as either name.
    const alias = /^(.*?)\s*\((.*)\)$/.exec(name);
    const names = alias ? [alias[1], alias[2]] : [name];
    const display = alias ? alias[2] : name;
    for (const n of names) {
      const key = normalizePlaceName(n);
      if (!index.has(key)) index.set(key, [display, place[1], place[2]]);
    }
  }
  return index;
}

const ZIP_ONLY = /^\s*(\d{5})(?:-\d{4})?\s*$/;
const TRAILING_ZIP = /[\s,]+(\d{5})(?:-\d{4})?\s*$/;
/** A trailing state: ", CA", " California". */
const STATE_SUFFIX = /[\s,]+(?:ca|calif|california)\.?\s*$/i;

/** True for a bare five-digit ZIP code, with or without the +4. */
export function isZipOnly(query: string): boolean {
  return ZIP_ONLY.test(query);
}

export function locatePlace(query: string): PlaceMatch | null {
  const zipOnly = ZIP_ONLY.exec(query);
  if (zipOnly) return zipMatch(zipOnly[1]);

  // A street address starts with a house number; leave those to the geocoder.
  if (/^\s*\d/.test(query)) return null;

  // "Sacramento, CA 95814" -> ZIP "95814", then state, leaving "Sacramento".
  const trailingZip = TRAILING_ZIP.exec(query);
  const cityText = normalizePlaceName(
    (trailingZip ? query.replace(TRAILING_ZIP, "") : query)
      .replace(STATE_SUFFIX, "")
      .replace(/^\s*city of\s+/i, ""),
  );
  const city = cityText ? placeIndex().get(cityText) : undefined;
  if (city) {
    return { kind: "city", label: `${city[0]}, CA`, latitude: city[1], longitude: city[2] };
  }
  // "Somewhere, CA 95816" with an unknown name still has a usable ZIP code.
  return trailingZip ? zipMatch(trailingZip[1]) : null;
}

function zipMatch(zip: string): PlaceMatch | null {
  const point = zips[zip];
  return point ? { kind: "zip", label: zip, latitude: point[0], longitude: point[1] } : null;
}

export const PLACE_COUNTS = { places: places.length, zips: Object.keys(zips).length };
