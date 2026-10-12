import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomMutation, zCustomQuery } from "convex-helpers/server/zod4";
import type { WithoutSystemFields } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Doc, TableNames } from "./_generated/dataModel";
import {
  CaasppResult,
  DashboardIndicator,
  Enrollment,
  Frpm,
  PrivateSchoolDetail,
  School,
  StaffRatio,
} from "../src/lib/schemas";
import { cellOf } from "../src/lib/domain/grid";
import { trimSpanToEnrollment } from "../src/lib/domain/grades";
import { searchTextOf } from "../src/lib/domain/names";
import { loadSummaryRecord } from "./lib/records";
import { summaryOf } from "../src/lib/domain/records";

/**
 * Internal mutations the import script calls in batches. Every upsert is
 * keyed so re-running an import rewrites the same documents instead of
 * adding duplicates. Rows arrive already validated by the domain schemas;
 * the Zod arg validators check them again at the door.
 */

const zInternalMutation = zCustomMutation(internalMutation, NoOp);
const zInternalQuery = zCustomQuery(internalQuery, NoOp);

type CdsTable = Extract<
  TableNames,
  "dashboard" | "caaspp" | "enrollment" | "frpm" | "staffRatios" | "privateDetails"
>;

/**
 * Replace-or-insert into a table indexed by cds. `sameKey` says which
 * existing document (if any) the incoming row stands for; for one-row-per-
 * school tables it is always the first match.
 */
async function upsertByCds<T extends CdsTable>(
  ctx: MutationCtx,
  table: T,
  rows: WithoutSystemFields<Doc<T>>[],
  sameKey: (
    existing: WithoutSystemFields<Doc<T>>,
    incoming: WithoutSystemFields<Doc<T>>,
  ) => boolean,
): Promise<number> {
  let written = 0;
  for (const row of rows) {
    const existing = await ctx.db
      .query(table)
      .withIndex("by_cds", (q) => q.eq("cds", row.cds))
      .collect();
    const match = existing.find((doc) =>
      sameKey(doc as unknown as WithoutSystemFields<Doc<T>>, row),
    );
    // The generic table name keeps TypeScript from narrowing the document type; the rows
    // were validated by the Zod arg validator for exactly this table.
    if (match) await ctx.db.replace(match._id, row as never);
    else await ctx.db.insert(table, row as never);
    written += 1;
  }
  return written;
}

export const upsertSchools = zInternalMutation({
  args: { schools: z.array(School) },
  handler: async (ctx, { schools }) => {
    let written = 0;
    for (const school of schools) {
      const existing = await ctx.db
        .query("schools")
        .withIndex("by_cds", (q) => q.eq("cds", school.cds))
        .first();
      const cell = school.coordinates ? cellOf(school.coordinates) : undefined;
      const doc = {
        ...school,
        // Keep the precomputed search summary; it is refreshed by rebuildSummaries.
        summary: existing?.summary,
        geoRow: cell?.row,
        geoCol: cell?.col,
        searchText: searchTextOf(school.name, school.address.city, school.district),
        // The span as the directory lists it. rebuildSummaries trims `gradesServed` to grades with students.
        directoryGradesServed: school.gradesServed,
      };
      if (existing) await ctx.db.replace(existing._id, doc);
      else await ctx.db.insert("schools", doc);
      written += 1;
    }
    return written;
  },
});

export const upsertDashboard = zInternalMutation({
  args: { rows: z.array(DashboardIndicator) },
  handler: (ctx, { rows }) =>
    upsertByCds(ctx, "dashboard", rows, (a, b) => a.year === b.year && a.indicator === b.indicator),
});

export const upsertCaaspp = zInternalMutation({
  args: { rows: z.array(CaasppResult) },
  handler: (ctx, { rows }) =>
    upsertByCds(
      ctx,
      "caaspp",
      rows,
      (a, b) => a.year === b.year && a.subject === b.subject && a.grade === b.grade,
    ),
});

export const upsertEnrollment = zInternalMutation({
  args: { rows: z.array(Enrollment) },
  handler: (ctx, { rows }) => upsertByCds(ctx, "enrollment", rows, () => true),
});

export const upsertFrpm = zInternalMutation({
  args: { rows: z.array(Frpm) },
  handler: (ctx, { rows }) => upsertByCds(ctx, "frpm", rows, () => true),
});

export const upsertStaff = zInternalMutation({
  args: { rows: z.array(StaffRatio) },
  handler: (ctx, { rows }) => upsertByCds(ctx, "staffRatios", rows, () => true),
});

export const upsertPrivateDetails = zInternalMutation({
  args: { rows: z.array(PrivateSchoolDetail) },
  handler: (ctx, { rows }) => upsertByCds(ctx, "privateDetails", rows, () => true),
});

/** Hand-curated private school matches: cds -> PSS id, or null to force "no match". */
export const listPrivateOverrides = zInternalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("privateSchoolOverrides").collect();
    return rows.map((r) => ({ cds: r.cds, pssId: r.pssId }));
  },
});

/**
 * Re-insert every school with coordinates into the spatial index, one page
 * per call. Returns the cursor for the next page or null when finished.
 */
/**
 * Recompute the stored search summary and grid cell for a page of schools. Run after any
 * import that changes Dashboard rows, enrollment, staff ratios, or private
 * school details. Each school costs about a dozen reads here, once, so that a
 * search costs one.
 */
export const rebuildSummaries = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), pageSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("schools")
      .paginate({ cursor: args.cursor, numItems: args.pageSize ?? 100 });
    for (const school of page.page) {
      const record = await loadSummaryRecord(ctx, school);
      const summary = summaryOf(record);
      const cell = school.coordinates ? cellOf(school.coordinates) : undefined;
      // Always start from the directory's own span, so a later enrollment file can widen it again.
      const listed = school.directoryGradesServed ?? school.gradesServed;
      const served =
        listed && record.enrollment
          ? trimSpanToEnrollment(listed, record.enrollment.byGrade)
          : listed;
      await ctx.db.patch(school._id, {
        summary,
        geoRow: cell?.row,
        geoCol: cell?.col,
        searchText: searchTextOf(school.name, school.address.city, school.district),
        directoryGradesServed: listed,
        gradesServed: served,
      });
    }
    return { updated: page.page.length, cursor: page.isDone ? null : page.continueCursor };
  },
});

export const startRun = internalMutation({
  args: { source: v.string(), url: v.string(), year: v.string() },
  handler: (ctx, args) =>
    ctx.db.insert("importRuns", {
      ...args,
      rowsRead: 0,
      rowsWritten: 0,
      rowsRejected: 0,
      startedAt: Date.now(),
      finishedAt: null,
      error: null,
    }),
});

export const finishRun = internalMutation({
  args: {
    id: v.id("importRuns"),
    rowsRead: v.number(),
    rowsWritten: v.number(),
    rowsRejected: v.number(),
    error: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, { ...rest, finishedAt: Date.now() });
  },
});

/** Test support: empty every data table so a contract test can load fixtures from scratch. */
export const clearAll = internalMutation({
  args: { table: v.string() },
  handler: async (ctx, { table }) => {
    const name = table as CdsTable | "schools" | "importRuns";
    const docs = await ctx.db.query(name).take(1000);
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return docs.length;
  },
});
