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
  /** Keep only what a history needs (all-grades test rows). Set for earlier years. */
  lean?: boolean;
  /** Dashboard only: load this one indicator's file instead of all of them. */
  indicator?: string;
  batchSize: number;
  log: (message: string) => void;
}

export interface Counts {
  rowsRead: number;
  rowsRejected: number;
  rowsWritten: number;
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

/** Call an internal upsert mutation once per batch. Returns documents written. */
export async function upsertInBatches<
  Args extends Record<string, unknown[]>,
  Name extends keyof Args & string,
>(
  ctx: ImportContext,
  mutation: FunctionReference<"mutation", "internal", Args, number>,
  argName: Name,
  rows: Args[Name],
  label: string,
  batchSize = ctx.batchSize,
): Promise<number> {
  if (ctx.dryRun) {
    ctx.log(`  dry run: would write ${rows.length} ${label}`);
    return 0;
  }
  let written = 0;
  const batches = chunk(rows as unknown[], batchSize);
  for (let i = 0; i < batches.length; i += 1) {
    written += await ctx.client.mutation(mutation, { [argName]: batches[i] } as Args);
    if ((i + 1) % 10 === 0 || i + 1 === batches.length) {
      ctx.log(`  wrote ${written}/${rows.length} ${label}`);
    }
  }
  return written;
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
      await ctx.client.mutation(internal.imports.finishRun, { id: runId, ...counts, error: null });
    }
    ctx.log(
      `== ${meta.source}: read ${counts.rowsRead}, rejected ${counts.rowsRejected}, written ${counts.rowsWritten}`,
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
