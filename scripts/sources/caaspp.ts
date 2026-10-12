import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import { caasppCds, caasppEntity, caasppResultFromRow } from "../../src/lib/domain/imports/caaspp";
import type { CaasppResult } from "../../src/lib/schemas";
import { CaasppRow } from "../../src/lib/schemas/imports/caaspp";
import { ensureFile } from "../lib/cache";
import { readDelimited } from "../lib/parse";
import { endYear, inCounty, recordRun, upsertInBatches, validateRows } from "../lib/runner";
import type { Source } from "./types";

/**
 * CAASPP statewide "all students" research file. State and district rows are
 * kept alongside school rows so the detail page can compare against them.
 */
export const caaspp: Source = {
  name: "caaspp",
  defaultYear: "2024-25",
  async run(ctx) {
    const year = endYear(ctx.year ?? this.defaultYear);
    const file = `sb_ca${year}_1_csv_v1`;
    const url = `https://caaspp-elpac.ets.org/caaspp/researchfiles/${file}.zip`;
    const path = join(ctx.cacheDir, "caaspp", String(year), `${file}.txt`);
    await ensureFile(url, path, { log: ctx.log, member: /sb_ca\d{4}_1.*\.txt$/i });

    return recordRun(ctx, { source: "caaspp", url, year: String(year) }, async () => {
      const raw = readDelimited(path, "^");
      const { ok, rejected } = validateRows(raw, CaasppRow, "caaspp", ctx.log);
      const rows: CaasppResult[] = [];
      const kept = { state: 0, district: 0, school: 0 };
      for (const row of ok) {
        const entity = caasppEntity(row);
        if (entity === "county" || entity === "other") continue;
        if (entity !== "state" && !inCounty(ctx, caasppCds(row))) continue;
        const result = caasppResultFromRow(row);
        if (!result) continue;
        // Every screen shows all grades together. Per-grade rows were five times the data
        // and were read on every school page without being shown, so they are not stored.
        if (result.grade !== "all") continue;
        rows.push(result);
        kept[entity] += 1;
      }
      ctx.log(`  caaspp rows kept: ${JSON.stringify(kept)}`);
      // Search rows do not read test scores, so there is nothing to refresh.
      const { rowsWritten } = await upsertInBatches(
        ctx,
        internal.imports.upsertCaaspp,
        "rows",
        rows,
        "caaspp rows",
      );
      return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten };
    });
  },
};
