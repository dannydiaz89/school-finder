import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import { staffRatioFromRow } from "../../src/lib/domain/imports/staff";
import type { StaffRatio } from "../../src/lib/schemas";
import { StaffRow } from "../../src/lib/schemas/imports/staff";
import { ensureFile } from "../lib/cache";
import { readDelimited } from "../lib/parse";
import { inCounty, recordRun, upsertInBatches, validateRows, yearSuffix } from "../lib/runner";
import type { Source } from "./types";

export const staff: Source = {
  name: "staff",
  defaultYear: "2023-24",
  async run(ctx) {
    const year = ctx.year ?? this.defaultYear;
    const file = `strat${yearSuffix(year)}.txt`;
    const url = `https://www3.cde.ca.gov/demo-downloads/staff/${file}`;
    const path = join(ctx.cacheDir, "staff", file);
    await ensureFile(url, path, { log: ctx.log });

    return recordRun(ctx, { source: "staff", url, year }, async () => {
      const raw = readDelimited(path, "\t");
      const { ok, rejected } = validateRows(raw, StaffRow, "staff", ctx.log);
      const rows: StaffRatio[] = [];
      for (const row of ok) {
        const out = staffRatioFromRow(row);
        if (out && inCounty(ctx, out.cds)) rows.push(out);
      }
      ctx.log(`  schools: ${rows.length}`);
      const { rowsWritten, changed } = await upsertInBatches(
        ctx,
        internal.imports.upsertStaff,
        "rows",
        rows,
        "staff rows",
      );
      return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten, changed };
    });
  },
};
