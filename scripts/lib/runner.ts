import type { FunctionReference } from "convex/server";
import type { z } from "zod";
import { internal } from "../../convex/_generated/api";
import { chunk } from "../../src/lib/domain/imports/common";
import type { AdminClient } from "./convex-admin";

/**
 * The plumbing every source shares: validate rows and count rejections,
 * write in batches through an internal mutation, and record the run.
 */

export interface ImportContext {
  client: AdminClient;
  cacheDir: string;
  /** School year as "2024-25", or undefined for the source's default. */
  year?: string;
  /** Two-digit county code to restrict to, or undefined for statewide. */
  county?: string;
  dryRun: boolean;
  /** Dashboard only: load this one indicator's file instead of all of them. */
  indicator?: string;
  batchSize: number;
  log: (message: string) => void;
}

export interface Counts {
  rowsRead: number;
  rowsRejected: number;
  /** Documents actually inserted or replaced. Zero when a re-run found nothing new. */
  rowsWritten: number;
  /**
   * Schools whose search row may now be out of date, for sources that feed it
   * (directory, Dashboard, enrollment, staff, private details). Left out by
   * sources search rows never read (meals, test scores).
   */
  changed?: string[];
}

/** What a batch of upserts did. */
export interface Written {
  rowsWritten: number;
  /** CDS codes of the schools whose documents were inserted or replaced. */
  changed: string[];
}

export interface Validated<T> {
  ok: T[];
  rejected: number;
}

/** Parse every row with `schema`. Failures are counted and the first few are logged, never dropped silently. */
export function validateRows<T extends z.ZodType>(
  rows: Record<string, string>[],
  schema: T,
  label: string,
  log: (message: string) => void,
  examples = 5,
): Validated<z.infer<T>> {
  const ok: z.infer<T>[] = [];
  let rejected = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const result = schema.safeParse(rows[i]);
    if (result.success) {
      ok.push(result.data);
    } else {
      rejected += 1;
      if (rejected <= examples) {
        const issue = result.error.issues[0];
        log(
          `  rejected ${label} row ${i + 2}: ${issue?.path.join(".")}: ${issue?.message} (value ${JSON.stringify(rows[i][String(issue?.path[0])])})`,
        );
      }
    }
  }
  if (rejected > 0)
    log(`  ${label}: ${rejected} of ${rows.length} rows rejected by the row schema`);
  return { ok, rejected };
}

/**
 * Call an internal upsert mutation once per batch. Returns how many documents
 * were written and which schools they belong to; unchanged rows are neither.
 */
export async function upsertInBatches<
  Args extends Record<string, unknown[]>,
  Name extends keyof Args & string,
>(
  ctx: ImportContext,
  mutation: FunctionReference<"mutation", "internal", Args, { written: number; changed: string[] }>,
  argName: Name,
  rows: Args[Name],
  label: string,
  batchSize = ctx.batchSize,
): Promise<Written> {
  if (ctx.dryRun) {
    ctx.log(`  dry run: would send ${rows.length} ${label}`);
    return { rowsWritten: 0, changed: [] };
  }
  let rowsWritten = 0;
  const changed = new Set<string>();
  const batches = chunk(rows as unknown[], batchSize);
  for (let i = 0; i < batches.length; i += 1) {
    const result = await ctx.client.mutation(mutation, { [argName]: batches[i] } as Args);
    rowsWritten += result.written;
    for (const cds of result.changed) changed.add(cds);
    if ((i + 1) % 10 === 0 || i + 1 === batches.length) {
      const sent = Math.min((i + 1) * batchSize, rows.length);
      ctx.log(`  sent ${sent}/${rows.length} ${label}; ${rowsWritten} new or changed`);
    }
  }
  return { rowsWritten, changed: [...changed] };
}

/** Schools refreshed per call. Each costs about five reads, so keep the transaction small. */
const REFRESH_BATCH = 100;

/**
 * Refresh the stored search row of the schools named, and of no others.
 * This replaces the statewide rebuild that used to follow every import: a
 * run that changed two hundred schools now reads two hundred, not twelve
 * thousand, and a re-run that changed nothing reads none.
 */
export async function refreshSearchRows(
  ctx: ImportContext,
  cds: Iterable<string>,
): Promise<number> {
  const list = [...new Set(cds)].sort();
  if (list.length === 0) {
    ctx.log("== search rows: nothing changed, nothing to refresh");
    return 0;
  }
  if (ctx.dryRun) {
    ctx.log(`== search rows: dry run, would refresh up to ${list.length} schools`);
    return 0;
  }
  let updated = 0;
  const batches = chunk(list, REFRESH_BATCH);
  for (let i = 0; i < batches.length; i += 1) {
    const result = await ctx.client.mutation(internal.imports.rebuildSummariesFor, {
      cds: batches[i],
    });
    updated += result.updated;
    if ((i + 1) % 20 === 0) ctx.log(`  refreshed ${(i + 1) * REFRESH_BATCH}/${list.length}`);
  }
  ctx.log(`== search rows: examined ${list.length} schools, ${updated} changed`);
  return updated;
}

/** Run `body` inside an importRuns record, marking it finished or failed. */
export async function recordRun(
  ctx: ImportContext,
  meta: { source: string; url: string; year: string },
  body: () => Promise<Counts>,
): Promise<Counts> {
  ctx.log(`== ${meta.source} (${meta.year}) ${meta.url}`);
  const runId = ctx.dryRun ? null : await ctx.client.mutation(internal.imports.startRun, meta);
  try {
    const counts = await body();
    if (runId) {
      await ctx.client.mutation(internal.imports.finishRun, {
        id: runId,
        rowsRead: counts.rowsRead,
        rowsRejected: counts.rowsRejected,
        rowsWritten: counts.rowsWritten,
        error: null,
      });
    }
    ctx.log(
      `== ${meta.source}: read ${counts.rowsRead}, rejected ${counts.rowsRejected}, new or changed ${counts.rowsWritten}`,
    );
    return counts;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await ctx.client.mutation(internal.imports.finishRun, {
        id: runId,
        rowsRead: 0,
        rowsRejected: 0,
        rowsWritten: 0,
        error: message.slice(0, 2000),
      });
    }
    throw err;
  }
}

/** True when `cds` belongs to the county the run is restricted to (or there is no restriction). */
export function inCounty(ctx: ImportContext, cds: string): boolean {
  return ctx.county === undefined || cds.startsWith(ctx.county);
}

/** "2024-25" -> "2425" for CDE file names. */
export function yearSuffix(schoolYear: string): string {
  const m = /^(\d{2})(\d{2})-(\d{2})$/.exec(schoolYear);
  if (!m) throw new Error(`Bad school year ${schoolYear}`);
  return m[2] + m[3];
}

/** "2024-25" -> 2025 (the Dashboard reporting year and CAASPP test year). */
export function endYear(schoolYear: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(schoolYear);
  if (!m) throw new Error(`Bad school year ${schoolYear}`);
  return Number(m[1]) + 1;
}

/** Accept "2024-25" or a bare end year "2025". */
export function normalizeYearArg(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  if (/^\d{4}$/.test(value)) {
    const end = Number(value);
    return `${end - 1}-${String(end % 100).padStart(2, "0")}`;
  }
  throw new Error(`--year must look like 2024-25 or 2025, got ${value}`);
}
