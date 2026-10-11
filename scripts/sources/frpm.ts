import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import { frpmCds, frpmFromRow } from "../../src/lib/domain/imports/frpm";
import type { Frpm } from "../../src/lib/schemas";
import { FrpmRow } from "../../src/lib/schemas/imports/frpm";
import { ensureFile } from "../lib/cache";
import { readSheet } from "../lib/parse";
import { inCounty, recordRun, upsertInBatches, validateRows, yearSuffix } from "../lib/runner";
import type { Source } from "./types";

export const frpm: Source = {
  name: "frpm",
  defaultYear: "2024-25",
  async run(ctx) {
    const year = ctx.year ?? this.defaultYear;
    const file = `frpm${yearSuffix(year)}.xlsx`;
    const url = `https://www.cde.ca.gov/ds/ad/documents/${file}`;
    const path = join(ctx.cacheDir, "frpm", file);
    await ensureFile(url, path, { log: ctx.log });

    return recordRun(ctx, { source: "frpm", url, year }, async () => {
      const raw = await readSheet(path, "FRPM School-Level Data", 2);
      const { ok, rejected } = validateRows(raw, FrpmRow, "frpm", ctx.log);
      const rows: Frpm[] = [];
      let empty = 0;
      for (const row of ok) {
        if (!inCounty(ctx, frpmCds(row))) continue;
        const out = frpmFromRow(row);
        if (out) rows.push(out);
        else empty += 1;
      }
      ctx.log(`  schools: ${rows.length}; without enrollment or counts: ${empty}`);
      const rowsWritten = await upsertInBatches(
        ctx,
        internal.imports.upsertFrpm,
        "rows",
        rows,
        "frpm rows",
      );
      return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten };
    });
  },
};
