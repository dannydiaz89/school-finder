import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomQuery } from "convex-helpers/server/zod4";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  GetSchoolArgs,
  GetSchoolsByCdsArgs,
  NearbyArgs,
  SearchArgs,
  type CdsCode,
  type SchoolDetail,
  type SchoolSummary,
} from "../src/lib/schemas";
import { isSpecializedPlacement } from "../src/lib/domain/filters";
import { milesToMeters } from "../src/lib/domain/geo";
import { buildComparison, rowFromSummary, summaryOf } from "../src/lib/domain/records";
import { assembleSearchResult } from "../src/lib/domain/search";
import { schoolIndex } from "./geospatial";
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
 * Upper bound on candidates pulled from the spatial index for one search.
 * Convex allows 4,096 document reads per query and each candidate costs about
 * three (the index entry, its cell, and the school), measured in downtown Los
 * Angeles: 1,233 candidates pass, 1,500 fail. 1,200 leaves headroom. When the
 * cap is hit the result is marked `truncated` and the page says so.
 */
export const MAX_CANDIDATES = 1200;
/** CDS of the statewide CAASPP rows. */
const STATE_CDS = "00000000000000" as CdsCode;

async function summariesNear(
  ctx: Parameters<typeof loadSummaryRecord>[0],
  center: { latitude: number; longitude: number },
  limit: number,
  maxDistance?: number,
): Promise<SchoolSummary[]> {
  const hits = await schoolIndex.nearest(ctx, { point: center, limit, maxDistance });
  const docs = await Promise.all(hits.map((hit) => ctx.db.get(hit.key)));
  const schools = docs.filter((d): d is Doc<"schools"> => d !== null);
  return Promise.all(
    schools.map(async (doc) => {
      // One read per school: the summary was computed at import time. A school imported
      // since the last rebuild has none yet, so compute it on the spot for that one.
      const summary = doc.summary ?? summaryOf(await loadSummaryRecord(ctx, doc));
      return rowFromSummary(toSchool(doc), summary, center);
    }),
  );
}

async function detail(
  ctx: Parameters<typeof loadRecord>[0],
  school: Doc<"schools">,
): Promise<SchoolDetail> {
  const record = await loadRecord(ctx, school);
  if (school.type === "private") return { ...record, caasppComparison: null };
  const [district, state] = await Promise.all([
    school.districtCds ? loadCaasppByCds(ctx, school.districtCds) : Promise.resolve([]),
    loadCaasppByCds(ctx, STATE_CDS),
  ]);
  return { ...record, caasppComparison: buildComparison(record.caaspp, district, state) };
}

export const search = zQuery({
  args: SearchArgs.shape,
  handler: async (ctx, args) => {
    const radiusMeters = milesToMeters(args.radiusMiles);
    // The index measures distance its own way; ask for a little more and let the domain cut exactly.
    const candidates = await summariesNear(ctx, args.center, MAX_CANDIDATES, radiusMeters * 1.02);
    const inRadius = candidates.filter((row) => row.distanceMeters <= radiusMeters);
    return assembleSearchResult(inRadius, args, candidates.length >= MAX_CANDIDATES);
  },
});

export const get = zQuery({
  args: GetSchoolArgs.shape,
  handler: async (ctx, args) => {
    const school = await schoolByCds(ctx, args.cds);
    return school ? detail(ctx, school) : null;
  },
});

export const nearby = zQuery({
  args: NearbyArgs.shape,
  handler: async (ctx, args) => {
    const school = await schoolByCds(ctx, args.cds);
    const center = school?.coordinates;
    if (!school || !center) return [];
    // Placements and the school itself are dropped after the fact, so over-fetch and widen if needed.
    let want = args.limit * 3 + 5;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const rows = await summariesNear(ctx, center, want);
      const kept = rows
        .filter((r) => r.school.cds !== args.cds && !isSpecializedPlacement(r.school))
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
      if (kept.length >= args.limit || rows.length < want) return kept.slice(0, args.limit);
      want *= 2;
    }
    return [];
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
