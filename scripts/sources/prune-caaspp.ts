import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import { caasppCds, caasppEntity, caasppResultFromRow } from "../../src/lib/domain/imports/caaspp";
import { chunk } from "../../src/lib/domain/imports/common";
import { CaasppRow } from "../../src/lib/schemas/imports/caaspp";
import { ensureFile } from "../lib/cache";
import { readDelimited } from "../lib/parse";
import { endYear, inCounty, validateRows } from "../lib/runner";
import type { Source } from "./types";

/** Entities pruned per call. Each has up to sixteen rows for a year. */
const BATCH = 100;

/**
 * One-time cleanup: delete the per-grade CAASPP rows stored for a year,
 * keeping each all-grades row. The importer used to store both; no screen
 * shows per-grade results, and every school page read them.
 *
 * The list of schools, districts and the state comes from the cached
 * research file for that year, so nothing is scanned in the database: each
 * entity's rows for the year are read once through an index and the
 * per-grade ones deleted.
 *
 *   pnpm run import prune-caaspp --year 2025 --dry-run
 */
export const pruneCaaspp: Source = {
  name: "prune-caaspp",
  defaultYear: "2024-25",
  async run(ctx) {
    const year = endYear(ctx.year ?? this.defaultYear);
    const file = `sb_ca${year}_1_csv_v1`;
    const url = `https://caaspp-elpac.ets.org/caaspp/researchfiles/${file}.zip`;
    const path = join(ctx.cacheDir, "caaspp", String(year), `${file}.txt`);
    await ensureFile(url, path, { log: ctx.log, member: /sb_ca\d{4}_1.*\.txt$/i });

    const raw = readDelimited(path, "^");
    const { ok, rejected } = validateRows(raw, CaasppRow, "caaspp", ctx.log);
    const withGradeRows = new Set<string>();
    let schoolYear: string | undefined;
    for (const row of ok) {
      const entity = caasppEntity(row);
      if (entity === "county" || entity === "other") continue;
      if (entity !== "state" && !inCounty(ctx, caasppCds(row))) continue;
      const result = caasppResultFromRow(row);
      if (!result) continue;
      schoolYear ??= result.year;
      if (result.grade !== "all") withGradeRows.add(result.cds);
    }
    const cds = [...withGradeRows].sort();
    ctx.log(`== prune-caaspp (${schoolYear ?? year}): ${cds.length} entities have per-grade rows`);
    if (ctx.dryRun || !schoolYear) {
      ctx.log("  dry run: nothing deleted");
      return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten: 0 };
    }
    let deleted = 0;
    const batches = chunk(cds, BATCH);
    for (let i = 0; i < batches.length; i += 1) {
      deleted += await ctx.client.mutation(internal.imports.pruneCaasppGrades, {
        cds: batches[i],
        year: schoolYear,
      });
      if ((i + 1) % 20 === 0 || i + 1 === batches.length) {
        ctx.log(
          `  ${Math.min((i + 1) * BATCH, cds.length)}/${cds.length} entities, ${deleted} rows deleted`,
        );
      }
    }
    ctx.log(`== prune-caaspp: deleted ${deleted} per-grade rows`);
    return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten: deleted };
  },
};
