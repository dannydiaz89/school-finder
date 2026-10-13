import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomQuery } from "convex-helpers/server/zod4";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  GetSchoolArgs,
  GetSchoolBriefsArgs,
  GetSchoolsByCdsArgs,
  NameSearchArgs,
  NearbyArgs,
  RadiusArgs,
  SearchArgs,
  type CdsCode,
  type SchoolDetail,
  type SchoolSummary,
} from "../src/lib/schemas";
import { milesToMeters } from "../src/lib/domain/geo";
import { ringRanges, rowRanges, type RowRange } from "../src/lib/domain/grid";
import { latestCaasppYear } from "../src/lib/domain/history";
import { normalizeName, rankByName } from "../src/lib/domain/names";
import { NEARBY_MAX_EXAMINED, NEARBY_RADII_MILES, isAlternativeTo } from "../src/lib/domain/nearby";
import { rowFromSummary, summaryOf, toDetail } from "../src/lib/domain/records";
import { assembleSearchResult } from "../src/lib/domain/search";
import {
  loadCaasppByCds,
  loadRecord,
  loadSummaryRecord,
  newestCaasppYear,
  schoolByCds,
  toSchool,
} from "./lib/records";

/**
 * Thin public queries behind src/lib/data/convex.ts. Arguments are validated
 * with the shared Zod schemas. Bodies look up documents and hand them to the
 * pure functions in src/lib/domain; no filtering or scoring lives here.
 */

const zQuery = zCustomQuery(query, NoOp);

/**
 * Safety bound on schools examined by one search. The densest case, 25 miles
 * around downtown Los Angeles, holds roughly 4,000. Past the bound the result
 * is marked `truncated`, keeps the nearest schools, and the page says so.
 */
export const MAX_CANDIDATES = 6000;
/** CDS of the statewide CAASPP rows. */
const STATE_CDS = "00000000000000" as CdsCode;

/**
 * Every school within `radiusMeters` of `center`, as search rows. One indexed
 * range read per grid row the circle touches, then an exact distance check.
 * Each school costs one document: its summary was computed at import time.
 */
async function rowsWithin(
  ctx: QueryCtx,
  center: { latitude: number; longitude: number },
  radiusMeters: number,
): Promise<SchoolSummary[]> {
  const rows = await rowsInRanges(ctx, rowRanges(center, radiusMeters), center);
  return rows.filter((row) => row.distanceMeters <= radiusMeters);
}

/** Every school filed under the grid cells given, as search rows measured from `center`. */
async function rowsInRanges(
  ctx: QueryCtx,
  ranges: RowRange[],
  center: { latitude: number; longitude: number },
): Promise<SchoolSummary[]> {
  const pages = await Promise.all(
    ranges.map((range) =>
      ctx.db
        .query("schools")
        .withIndex("by_geo", (q) =>
          q.eq("geoRow", range.row).gte("geoCol", range.colMin).lte("geoCol", range.colMax),
        )
        .collect(),
    ),
  );
  const rows = await Promise.all(
    pages.flat().map(async (doc) => {
      // A school imported since the last rebuild has no summary yet; compute it for that one.
      const summary = doc.summary ?? summaryOf(await loadSummaryRecord(ctx, doc));
      return rowFromSummary(toSchool(doc), summary, center);
    }),
  );
  return rows;
}

async function detail(
  ctx: Parameters<typeof loadRecord>[0],
  school: Doc<"schools">,
): Promise<SchoolDetail> {
  const record = await loadRecord(ctx, school);
  if (school.type === "private") return toDetail(record, [], []);
  // The comparison is for one school year: the school's newest, or when the school has no
  // results, the newest its district or the state has. Read district and state rows for that
  // year only, not every year on file.
  const year =
    latestCaasppYear(record.caaspp) ??
    (school.districtCds ? await newestCaasppYear(ctx, school.districtCds) : null) ??
    (await newestCaasppYear(ctx, STATE_CDS));
  if (year === null) return toDetail(record, [], []);
  const [district, state] = await Promise.all([
    school.districtCds ? loadCaasppByCds(ctx, school.districtCds, year) : Promise.resolve([]),
    loadCaasppByCds(ctx, STATE_CDS, year),
  ]);
  return toDetail(record, district, state);
}

/** Rows within the radius, nearest first when the safety bound is exceeded. */
async function boundedRows(
  ctx: QueryCtx,
  center: { latitude: number; longitude: number },
  radiusMiles: number,
): Promise<{ rows: SchoolSummary[]; truncated: boolean }> {
  const inRadius = await rowsWithin(ctx, center, milesToMeters(radiusMiles));
  if (inRadius.length <= MAX_CANDIDATES) return { rows: inRadius, truncated: false };
  const nearest = inRadius
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_CANDIDATES);
  return { rows: nearest, truncated: true };
}

export const search = zQuery({
  args: SearchArgs.shape,
  handler: async (ctx, args) => {
    const { rows, truncated } = await boundedRows(ctx, args.center, args.radiusMiles);
    return assembleSearchResult(rows, args, truncated);
  },
});

/** Unfiltered rows for a radius; pages cache these and filter them locally. */
export const inRadius = zQuery({
  args: RadiusArgs.shape,
  handler: async (ctx, args) => boundedRows(ctx, args.center, args.radiusMiles),
});

/** How many text-index hits to consider before applying the exact word rule and ranking. */
const NAME_CANDIDATES = 200;

/**
 * Name search. The text index over name, city, and district proposes candidates
 * (it matches any word and treats the last as a prefix); `rankByName` then keeps
 * only schools where every word typed begins a word of the name or its city or
 * district, and orders them.
 */
export const findByName = zQuery({
  args: NameSearchArgs.shape,
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("schools")
      .withSearchIndex("search_text", (q) => q.search("searchText", normalizeName(args.query)))
      .take(NAME_CANDIDATES);
    const ranked = rankByName(
      candidates,
      args.query,
      (doc) => doc.name,
      (doc) => `${doc.address.city} ${doc.district}`,
    ).slice(0, args.limit);
    return Promise.all(
      ranked.map(async (doc) => ({
        school: toSchool(doc),
        ...(doc.summary ?? summaryOf(await loadSummaryRecord(ctx, doc))),
      })),
    );
  },
});

/** Summary rows for a list of schools, in the order asked. One document read per school. */
export const briefs = zQuery({
  args: GetSchoolBriefsArgs.shape,
  handler: async (ctx, args) => {
    const docs = await Promise.all(args.cds.map((cds) => schoolByCds(ctx, cds)));
    return Promise.all(
      docs
        .filter((doc): doc is Doc<"schools"> => doc !== null)
        .map(async (doc) => ({
          school: toSchool(doc),
          ...(doc.summary ?? summaryOf(await loadSummaryRecord(ctx, doc))),
        })),
    );
  },
});

export const get = zQuery({
  args: GetSchoolArgs.shape,
  handler: async (ctx, args) => {
    const school = await schoolByCds(ctx, args.cds);
    return school ? detail(ctx, school) : null;
  },
});

/**
 * The nearest schools that are alternatives to this one: ordinary choices
 * serving the same grades (see `isAlternativeTo`).
 *
 * The circle widens step by step until it holds enough of them. Each step
 * reads only the ring of grid cells the last step did not, so a school is
 * read once however far the search goes. An elementary school in a city is
 * done in the first step; a high school has to look farther, because high
 * schools are farther apart.
 */
export const nearby = zQuery({
  args: NearbyArgs.shape,
  handler: async (ctx, args) => {
    const doc = await schoolByCds(ctx, args.cds);
    const center = doc?.coordinates;
    if (!doc || !center) return [];
    const school = toSchool(doc);
    const nearest = (rows: SchoolSummary[]) =>
      rows.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, args.limit);

    const found: SchoolSummary[] = [];
    let examined = 0;
    let reached = 0;
    for (const miles of NEARBY_RADII_MILES) {
      const radius = milesToMeters(miles);
      const ranges =
        reached === 0 ? rowRanges(center, radius) : ringRanges(center, reached, radius);
      const rows = await rowsInRanges(ctx, ranges, center);
      examined += rows.length;
      reached = radius;
      found.push(...rows.filter((row) => isAlternativeTo(school, row.school)));
      // Cells are read whole, so some schools found lie outside the circle. The nearest
      // `limit` are certain only once that many lie inside it.
      const inside = found.filter((row) => row.distanceMeters <= radius);
      if (inside.length >= args.limit) return nearest(inside);
      if (examined >= NEARBY_MAX_EXAMINED) break;
    }
    return nearest(found.filter((row) => row.distanceMeters <= reached));
  },
});

export const byCds = zQuery({
  args: GetSchoolsByCdsArgs.shape,
  handler: async (ctx, args) => {
    const schools = await Promise.all(args.cds.map((cds) => schoolByCds(ctx, cds)));
    return Promise.all(
      schools.filter((s): s is Doc<"schools"> => s !== null).map((s) => detail(ctx, s)),
    );
  },
});
