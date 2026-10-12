/**
 * Build src/features/search/places.json: the center point of every California
 * city, town, community, and ZIP code area, from the Census Bureau Gazetteer.
 * The search box uses it to resolve "Sacramento" or "95816" without calling a
 * geocoder.
 *
 *   pnpm tsx scripts/build-places.ts --places <YYYY_gaz_place_06.txt> --zcta <YYYY_Gaz_zcta_national.txt>
 *
 * Sources (public domain):
 *   https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_gaz_place_06.txt
 *   https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { readDelimited } from "./lib/parse";

const { values } = parseArgs({
  options: {
    places: { type: "string" },
    zcta: { type: "string" },
    out: { type: "string", default: "src/features/search/places.json" },
  },
});
if (!values.places || !values.zcta) {
  console.error("Usage: pnpm tsx scripts/build-places.ts --places <file> --zcta <file>");
  process.exit(2);
}

const round = (value: string) => Math.round(Number(value) * 1e5) / 1e5;

/** "Sacramento city" -> ["Sacramento", "city"]; "Arden-Arcade CDP" -> ["Arden-Arcade", "CDP"]. */
function splitName(raw: string): [string, string] {
  const match = /^(.*?)\s+(city|town|CDP)$/.exec(raw.trim());
  return match ? [match[1], match[2]] : [raw.trim(), ""];
}

type Place = { name: string; kind: string; area: number; lat: number; lng: number };
const byKey = new Map<string, Place>();
let placeRows = 0;
for (const row of readDelimited(values.places, "|")) {
  if (row.USPS !== "CA") continue;
  placeRows += 1;
  const [name, kind] = splitName(row.NAME);
  const place: Place = {
    name,
    kind,
    area: Number(row.ALAND),
    lat: round(row.INTPTLAT),
    lng: round(row.INTPTLONG),
  };
  const key = name.toLowerCase();
  const existing = byKey.get(key);
  // Two places can share a name (a city and an unincorporated community elsewhere).
  // An incorporated city or town wins; otherwise the larger one.
  const incorporated = (p: Place) => p.kind === "city" || p.kind === "town";
  if (
    !existing ||
    (incorporated(place) && !incorporated(existing)) ||
    (incorporated(place) === incorporated(existing) && place.area > existing.area)
  ) {
    byKey.set(key, place);
  }
}

const zips: Record<string, [number, number]> = {};
for (const row of readDelimited(values.zcta, "|")) {
  const zip = row.GEOID;
  // California ZIP codes run from 90001 to 96162.
  if (!/^9[0-6]\d{3}$/.test(zip) || Number(zip) > 96199) continue;
  zips[zip] = [round(row.INTPTLAT), round(row.INTPTLONG)];
}

const places = [...byKey.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((p) => [p.name, p.lat, p.lng] as const);

writeFileSync(
  values.out,
  JSON.stringify({
    source: "U.S. Census Bureau Gazetteer Files, 2025",
    places,
    zips,
  }) + "\n",
);
console.error(
  `${placeRows} place rows -> ${places.length} names; ${Object.keys(zips).length} ZIP code areas -> ${values.out}`,
);
