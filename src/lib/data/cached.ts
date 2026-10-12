import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { z } from "zod";
import { assembleSearchResult } from "@/lib/domain/search";
import { SearchArgs, type RadiusArgs } from "@/lib/schemas";
import {
  findSchoolsByName,
  getNearby,
  getSchool,
  getSchoolBriefs,
  getSchoolsByCds,
  getSchoolsInRadius,
  searchSchools,
} from "./index";

/**
 * Cached versions of the data-access functions, for pages. School data
 * changes about once a year, so a result is kept for hours and shared by
 * everyone who asks the same question: a repeated search, a filter toggled
 * back, or a return from a school page never reaches the backend.
 *
 * Every entry carries the `schools` tag. After an import, call
 * `revalidateTag("schools")` to drop them all at once.
 */

export const SCHOOLS_CACHE_TAG = "schools";

/**
 * Largest radius whose full set of schools is cached and filtered here. Up to
 * this size the set is a few hundred rows even in the densest city. Beyond
 * it (thousands of rows around Los Angeles) the backend filters instead and
 * each distinct filter combination is cached on its own.
 */
export const LOCAL_FILTER_MAX_MILES = 5;

async function cachedRowsInRadius(args: RadiusArgs) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return getSchoolsInRadius(args);
}

async function cachedBackendSearch(args: SearchArgs) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return searchSchools(args);
}

/**
 * Search. For ordinary radii the schools around the address are fetched once
 * and cached; filters, sorting, and paging are then applied in this process by
 * the same `assembleSearchResult` the backend uses, so changing a filter costs
 * no backend round trip and returns identical results.
 */
export async function cachedSearchSchools(input: z.input<typeof SearchArgs>) {
  const args = SearchArgs.parse(input);
  if (args.radiusMiles > LOCAL_FILTER_MAX_MILES) return cachedBackendSearch(args);
  const { rows, truncated } = await cachedRowsInRadius({
    center: args.center,
    radiusMiles: args.radiusMiles,
  });
  return assembleSearchResult(rows, args, truncated);
}

export async function cachedGetSchool(args: Parameters<typeof getSchool>[0]) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return getSchool(args);
}

export async function cachedGetNearby(args: Parameters<typeof getNearby>[0]) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return getNearby(args);
}

export async function cachedGetSchoolsByCds(args: Parameters<typeof getSchoolsByCds>[0]) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return getSchoolsByCds(args);
}

export async function cachedFindSchoolsByName(args: Parameters<typeof findSchoolsByName>[0]) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return findSchoolsByName(args);
}

export async function cachedGetSchoolBriefs(args: Parameters<typeof getSchoolBriefs>[0]) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_CACHE_TAG);
  return getSchoolBriefs(args);
}
