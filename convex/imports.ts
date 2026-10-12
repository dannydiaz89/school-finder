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
import { sameContent } from "../src/lib/domain/equal";
import { cellOf } from "../src/lib/domain/grid";
import { servedSpan } from "../src/lib/domain/grades";
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

/** What an upsert did: documents written, and the schools they belong to. */
interface UpsertResult {
  written: number;
  changed: string[];
}

type CdsTable = Extract<
  TableNames,
  "dashboard" | "caaspp" | "enrollment" | "frpm" | "staffRatios" | "privateDetails"
>;

/** Tables that hold one row per school per year and have a `by_cds_year` index. */
type YearTable = "dashboard" | "caaspp";

/**
 * Replace-or-insert into a table indexed by cds. `sameKey` says which
 * existing document (if any) the incoming row stands for.
 *
 * Written to spend as little database bandwidth as possible, which is the
 * tight limit on Convex's free plan:
 * - existing rows are read once per school (and year) per batch, not once per row;
 * - year tables read only the year being imported, not every year on file;
 * - a row whose content has not changed is not written at all, so re-running
 *   an import costs reads only.
 *
 * Returns how many documents it wrote and which schools they belong to, so the
 * caller can refresh search rows for those schools alone.
 */
async function upsertByCds<T extends CdsTable>(
  ctx: MutationCtx,
  table: T,
  rows: WithoutSystemFields<Doc<T>>[],
  sameKey: (
    existing: WithoutSystemFields<Doc<T>>,
    incoming: WithoutSystemFields<Doc<T>>,
  ) => boolean,
): Promise<UpsertResult> {
  const byYear = table === "dashboard" || table === "caaspp";
  const loaded = new Map<string, Doc<T>[]>();
  const existingFor = async (row: WithoutSystemFields<Doc<T>>): Promise<Doc<T>[]> => {
    const year = byYear ? (row as unknown as { year: string | number }).year : undefined;
    const key = `${row.cds}|${year ?? ""}`;
    let docs = loaded.get(key);
    if (!docs) {
      docs = (
        byYear
          ? await ctx.db
              .query(table as YearTable)
              .withIndex("by_cds_year", (q) => q.eq("cds", row.cds).eq("year", year as never))
              .collect()
          : await ctx.db
              .query(table)
              .withIndex("by_cds", (q) => q.eq("cds", row.cds))
              .collect()
      ) as Doc<T>[];
      loaded.set(key, docs);
    }
    return docs;
  };

  let written = 0;
  const changed = new Set<string>();
  for (const row of rows) {
    const existing = await existingFor(row);
    const match = existing.find((doc) =>
      sameKey(doc as unknown as WithoutSystemFields<Doc<T>>, row),
    );
    // The generic table name keeps TypeScript from narrowing the document type; the rows
    // were validated by the Zod arg validator for exactly this table.
    if (!match) {
      const id = await ctx.db.insert(table, row as never);
      existing.push({ ...(row as object), _id: id, _creationTime: 0 } as unknown as Doc<T>);
    } else if (!sameContent(match, row)) {
      await ctx.db.replace(match._id, row as never);
      existing[existing.indexOf(match)] = { ...match, ...(row as object) } as Doc<T>;
    } else {
      continue;
    }
    written += 1;
    changed.add(row.cds);
  }
  return { written, changed: [...changed] };
}

export const upsertSchools = zInternalMutation({
  args: { schools: z.array(School) },
  handler: async (ctx, { schools }): Promise<UpsertResult> => {
    let written = 0;
    const changed: string[] = [];
    for (const school of schools) {
      const existing = await ctx.db
        .query("schools")
        .withIndex("by_cds", (q) => q.eq("cds", school.cds))
        .first();
      const cell = school.coordinates ? cellOf(school.coordinates) : undefined;
      // `gradesServed` on a stored school is the directory's span narrowed to grades with
      // students. While the directory's own span is unchanged, keep the narrowed one, or every
      // such school would be rewritten here and then rewritten back by the refresh.
      const sameListing =
        existing !== null &&
        sameContent(
          { span: existing.directoryGradesServed ?? null },
          { span: school.gradesServed ?? null },
        );
      const doc = {
        ...school,
        gradesServed: sameListing ? existing.gradesServed : school.gradesServed,
        // Keep the precomputed search summary; the refresh recomputes it when its inputs change.
        summary: existing?.summary,
        geoRow: cell?.row,
        geoCol: cell?.col,
        searchText: searchTextOf(school.name, school.address.city, school.district),
        // The span as the directory lists it (see servedSpan for how it is narrowed).
        directoryGradesServed: school.gradesServed,
      };
      if (!existing) await ctx.db.insert("schools", doc);
      else if (!sameContent(existing, doc)) await ctx.db.replace(existing._id, doc);
      else continue;
      written += 1;
      changed.push(school.cds);
    }
    return { written, changed };
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
 * Recompute what search reads from one school document: its summary, grid
 * cell, search text, and the grade span narrowed to grades with students.
 * Costs about five reads. Writes only when something changed, and says so.
 */
async function refreshSearchFields(ctx: MutationCtx, school: Doc<"schools">): Promise<boolean> {
  const record = await loadSummaryRecord(ctx, school);
  const summary = summaryOf(record);
  const cell = school.coordinates ? cellOf(school.coordinates) : undefined;
  // Always start from the directory's own span, so a later enrollment file can widen it again.
  const listed = school.directoryGradesServed ?? school.gradesServed;
  const served =
    listed && record.enrollment ? servedSpan(listed, record.enrollment.byGrade) : listed;
  const next = {
    summary,
    geoRow: cell?.row,
    geoCol: cell?.col,
    searchText: searchTextOf(school.name, school.address.city, school.district),
    directoryGradesServed: listed,
    gradesServed: served,
  };
  const current = {
    summary: school.summary,
    geoRow: school.geoRow,
    geoCol: school.geoCol,
    searchText: school.searchText,
    directoryGradesServed: school.directoryGradesServed,
    gradesServed: school.gradesServed,
  };
  if (sameContent(current, next)) return false;
  await ctx.db.patch(school._id, next);
  return true;
}

/**
 * Refresh the search fields of the schools named. This is what an import
 * runs when it finishes, with the schools whose Dashboard rows, enrollment,
 * staff ratio, private details, or directory entry it actually changed. An
 * import that changed nothing refreshes nothing.
 */
export const rebuildSummariesFor = internalMutation({
  args: { cds: v.array(v.string()) },
  handler: async (ctx, { cds }) => {
    let updated = 0;
    for (const code of cds) {
      const school = await ctx.db
        .query("schools")
        .withIndex("by_cds", (q) => q.eq("cds", code as Doc<"schools">["cds"]))
        .first();
      if (school && (await refreshSearchFields(ctx, school))) updated += 1;
    }
    return { examined: cds.length, updated };
  },
});

/**
 * Refresh the search fields of every school, a page at a time. Statewide,
 * so it reads every school and its tables: run it only after changing how a
 * summary or a grade span is computed. Imports use `rebuildSummariesFor`.
 */
export const rebuildSummaries = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), pageSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("schools")
      .paginate({ cursor: args.cursor, numItems: args.pageSize ?? 100 });
    for (const school of page.page) await refreshSearchFields(ctx, school);
    return { updated: page.page.length, cursor: page.isDone ? null : page.continueCursor };
  },
});

/**
 * Delete the per-grade CAASPP rows of the entities named, for one school
 * year, keeping the all-grades row. No screen shows per-grade results, and
 * while they are stored every school page reads them. One-time cleanup for
 * data loaded before the importer stopped storing them.
 */
export const pruneCaasppGrades = internalMutation({
  args: { cds: v.array(v.string()), year: v.string() },
  handler: async (ctx, { cds, year }) => {
    let deleted = 0;
    for (const code of cds) {
      const rows = await ctx.db
        .query("caaspp")
        .withIndex("by_cds_year", (q) => q.eq("cds", code as never).eq("year", year as never))
        .collect();
      for (const row of rows) {
        if (row.grade === "all") continue;
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }
    return deleted;
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
