/**
 * Proves, against the live deployment, that filtering cached radius rows in
 * the web process returns exactly what the backend search returns.
 *
 *   pnpm tsx scripts/verify-local-filter.ts
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { api } from "../convex/_generated/api";
import { assembleSearchResult } from "../src/lib/domain/search";
import {
  DEFAULT_SEARCH_FILTERS,
  RadiusRows,
  SearchResult,
  type SearchArgs,
} from "../src/lib/schemas";

const url = readFileSync(".env.local", "utf8").match(/NEXT_PUBLIC_CONVEX_URL=(\S+)/)?.[1];
if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing from .env.local");
const client = new ConvexHttpClient(url, { logger: false });

const places: [string, number, number][] = [
  ["Sacramento", 38.57421, -121.4894],
  ["Los Angeles", 34.0522, -118.2437],
  ["San Francisco", 37.7599, -122.4148],
  ["Fresno", 36.7378, -119.7871],
  ["Redding", 40.5865, -122.3917],
];
const variants: [string, Partial<SearchArgs>][] = [
  ["default", {}],
  ["charter", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["charter"] } }],
  ["private", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["private"] } }],
  ["elementary", { filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["tk", "elementary"] } }],
  ["ela>=green", { filters: { ...DEFAULT_SEARCH_FILTERS, minElaLevel: "green" } }],
  ["specialized", { filters: { ...DEFAULT_SEARCH_FILTERS, includeSpecialized: true } }],
  ["sort ela, page 2", { sort: "ela", limit: 25, offset: 25 }],
  ["sort enrollment", { sort: "enrollment" }],
];

async function main() {
  let failures = 0;
  let checks = 0;
  for (const [name, latitude, longitude] of places) {
    for (const radiusMiles of [1, 3, 5]) {
      const center = { latitude, longitude };
      const radius = RadiusRows.parse(
        await client.query(api.schools.inRadius, { center, radiusMiles }),
      );
      for (const [label, patch] of variants) {
        const args: SearchArgs = {
          center,
          radiusMiles,
          filters: DEFAULT_SEARCH_FILTERS,
          sort: "distance",
          limit: 25,
          offset: 0,
          ...patch,
        };
        const backend = SearchResult.parse(await client.query(api.schools.search, args));
        const local = assembleSearchResult(radius.rows, args, radius.truncated);
        checks += 1;
        if (!isDeepStrictEqual(local, backend)) {
          failures += 1;
          console.log(
            `MISMATCH ${name} ${radiusMiles} mi ${label}: local total ${local.total}, backend ${backend.total}`,
          );
        }
      }
    }
  }
  console.log(`${checks - failures}/${checks} comparisons identical`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
