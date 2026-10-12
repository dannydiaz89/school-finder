import { z } from "zod";
import {
  DEFAULT_RADIUS_MILES,
  DEFAULT_SEARCH_FILTERS,
  GradeBand,
  MAX_COMPARE,
  MAX_RADIUS_MILES,
  Program,
  SearchFilters,
  SortKey,
} from "./api";
import { Affiliation, CdsCode, SchoolType } from "./common";
import { DashboardLevel } from "./dashboard";

/**
 * Query-string state. Search, detail, and compare pages all read and write
 * these keys so a URL fully describes what the user is looking at.
 *
 *   ?address=1420+J+St+Sacramento&lat=38.58&lng=-121.49&radius=3
 *   &types=district,charter&grades=tk,elementary&programs=magnet
 *   &rating=green&size=500&specialized=1&sort=distance&compare=cds,cds
 */

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function first(raw: RawParams, key: string): string | undefined {
  if (raw instanceof URLSearchParams) return raw.get(key) ?? undefined;
  const value = raw[key];
  return Array.isArray(value) ? value[0] : value;
}

/** "a,b,c" -> ["a","b","c"], dropping blanks and duplicates, validating each against `item`. */
const csv = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string"
        ? Array.from(
            new Set(
              value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          )
        : value,
    z.array(item),
  );

const flag = z.preprocess((value) => value === "1" || value === "true", z.boolean());

export const SearchParams = z
  .object({
    address: z.string().trim().min(1).max(200).optional(),
    /** Set when the search location is a city or ZIP code center rather than a street address. */
    loc: z.enum(["city", "zip"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(0.25).max(MAX_RADIUS_MILES).default(DEFAULT_RADIUS_MILES),
    types: csv(SchoolType).default(DEFAULT_SEARCH_FILTERS.types),
    grades: csv(GradeBand).default([]),
    programs: csv(Program).default([]),
    affiliations: csv(Affiliation).default([]),
    rating: DashboardLevel.nullable().default(null),
    size: z.coerce.number().int().positive().nullable().default(null),
    specialized: flag.default(false),
    sort: SortKey.default("distance"),
    /** Treat the text as a school name even when it is also a city, e.g. "Lincoln". */
    by: z.enum(["name"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();
export type SearchParams = z.infer<typeof SearchParams>;

export const CompareParams = z
  .object({
    compare: csv(CdsCode).default([]),
    address: z.string().trim().min(1).max(200).optional(),
    /** Set when the search location is a city or ZIP code center rather than a street address. */
    loc: z.enum(["city", "zip"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict()
  .transform((p) => ({ ...p, compare: p.compare.slice(0, MAX_COMPARE) }));
export type CompareParams = z.infer<typeof CompareParams>;

function pick(raw: RawParams, keys: readonly string[]) {
  const out: Record<string, string | undefined> = {};
  for (const key of keys) {
    const v = first(raw, key);
    if (v !== undefined && v !== "") out[key] = v;
  }
  return out;
}

/** Parse leniently: an invalid value falls back to its default instead of failing the page. */
export function parseSearchParams(raw: RawParams): SearchParams {
  const picked = pick(raw, Object.keys(SearchParams.shape));
  const result = SearchParams.safeParse(picked);
  if (result.success) return result.data;
  // Drop each offending key and parse again.
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete picked[key];
  }
  return SearchParams.parse(picked);
}

export function parseCompareParams(raw: RawParams): CompareParams {
  const picked = pick(raw, ["compare", "address", "loc", "lat", "lng"]);
  const result = CompareParams.safeParse(picked);
  if (result.success) return result.data;
  // A bad CDS code in the list drops the whole list rather than guessing.
  delete picked.compare;
  return CompareParams.parse(picked);
}

/** Turn parsed search state into filters for the data-access API. */
export function toSearchFilters(p: SearchParams): SearchFilters {
  return {
    types: p.types.length ? p.types : DEFAULT_SEARCH_FILTERS.types,
    gradeBands: p.grades,
    programs: p.programs,
    affiliations: p.affiliations,
    minElaLevel: p.rating,
    maxEnrollment: p.size,
    includeSpecialized: p.specialized,
  };
}

/** Serialize only the keys that differ from their defaults, so URLs stay short. */
export function serializeSearchParams(p: Partial<SearchParams>): URLSearchParams {
  const out = new URLSearchParams();
  if (p.address) out.set("address", p.address);
  if (p.loc) out.set("loc", p.loc);
  if (p.by) out.set("by", p.by);
  if (p.lat !== undefined) out.set("lat", p.lat.toFixed(5));
  if (p.lng !== undefined) out.set("lng", p.lng.toFixed(5));
  if (p.radius !== undefined && p.radius !== DEFAULT_RADIUS_MILES)
    out.set("radius", String(p.radius));
  if (p.types && !sameSet(p.types, DEFAULT_SEARCH_FILTERS.types))
    out.set("types", p.types.join(","));
  if (p.grades?.length) out.set("grades", p.grades.join(","));
  if (p.programs?.length) out.set("programs", p.programs.join(","));
  if (p.affiliations?.length) out.set("affiliations", p.affiliations.join(","));
  if (p.rating) out.set("rating", p.rating);
  if (p.size) out.set("size", String(p.size));
  if (p.specialized) out.set("specialized", "1");
  if (p.sort && p.sort !== "distance") out.set("sort", p.sort);
  if (p.page && p.page > 1) out.set("page", String(p.page));
  return out;
}

export function serializeCompareParams(p: Partial<CompareParams>): URLSearchParams {
  const out = new URLSearchParams();
  if (p.compare?.length) out.set("compare", p.compare.join(","));
  if (p.address) out.set("address", p.address);
  if (p.loc) out.set("loc", p.loc);
  if (p.lat !== undefined) out.set("lat", p.lat.toFixed(5));
  if (p.lng !== undefined) out.set("lng", p.lng.toFixed(5));
  return out;
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}
