import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomQuery } from "convex-helpers/server/zod4";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  GetSchoolArgs,
  GetSchoolsByCdsArgs,
  NameSearchArgs,
  NearbyArgs,
  RadiusArgs,
  SearchArgs,
  type CdsCode,
  type SchoolDetail,
  type SchoolSummary,
} from "../src/lib/schemas";
import { isSpecializedPlacement } from "../src/lib/domain/filters";
import { milesToMeters } from "../src/lib/domain/geo";
import { rowRanges } from "../src/lib/domain/grid";
import { normalizeName, rankByName } from "../src/lib/domain/names";
import { rowFromSummary, summaryOf, toDetail } from "../src/lib/domain/records";
import { assembleSearchResult } from "../src/lib/domain/search";
import {
  loadCaasppByCds,
  loadRecord,
  loadSummaryRecord,
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
  const pages = await Promise.all(
    rowRanges(center, radiusMeters).map((range) =>
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
  return rows.filter((row) => row.distanceMeters <= radiusMeters);
}

async function detail(
  ctx: Parameters<typeof loadRecord>[0],
  school: Doc<"schools">,
): Promise<SchoolDetail> {
  const record = await loadRecord(ctx, school);
  if (school.type === "private") return toDetail(record, [], []);
  const [district, state] = await Promise.all([
    school.districtCds ? loadCaasppByCds(ctx, school.districtCds) : Promise.resolve([]),
    loadCaasppByCds(ctx, STATE_CDS),
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

export const get = zQuery({
  args: GetSchoolArgs.shape,
  handler: async (ctx, args) => {
    const school = await schoolByCds(ctx, args.cds);
    return school ? detail(ctx, school) : null;
  },
});

/** Radii tried in turn when looking for a school's neighbors, in miles. */
const NEARBY_RADII = [2, 6, 20, 60];

export const nearby = zQuery({
  args: NearbyArgs.shape,
  handler: async (ctx, args) => {
    const school = await schoolByCds(ctx, args.cds);
    const center = school?.coordinates;
    if (!school || !center) return [];
    // Widen the circle until it holds enough ordinary schools; cities stop at the first try.
    let kept: SchoolSummary[] = [];
    for (const miles of NEARBY_RADII) {
      const rows = await rowsWithin(ctx, center, milesToMeters(miles));
      kept = rows.filter((r) => r.school.cds !== args.cds && !isSpecializedPlacement(r.school));
      if (kept.length >= args.limit) break;
    }
    return kept.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, args.limit);
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
