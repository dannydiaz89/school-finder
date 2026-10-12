import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import {
  addEnrollmentRow,
  enrollmentCds,
  finishEnrollment,
  startEnrollment,
  type EnrollmentAccumulator,
} from "../../src/lib/domain/imports/enrollment";
import type { Enrollment } from "../../src/lib/schemas";
import { EnrollmentRow } from "../../src/lib/schemas/imports/enrollment";
import { ensureFile } from "../lib/cache";
import { readDelimited } from "../lib/parse";
import { inCounty, recordRun, upsertInBatches, validateRows, yearSuffix } from "../lib/runner";
import type { Source } from "./types";

export const enrollment: Source = {
  name: "enrollment",
  defaultYear: "2024-25",
  async run(ctx) {
    const year = ctx.year ?? this.defaultYear;
    const file = `cdenroll${yearSuffix(year)}.txt`;
    const url = `https://www3.cde.ca.gov/demo-downloads/census/${file}`;
    const path = join(ctx.cacheDir, "enrollment", file);
    await ensureFile(url, path, { log: ctx.log });

    return recordRun(ctx, { source: "enrollment", url, year }, async () => {
      const raw = readDelimited(path, "\t");
      const { ok, rejected } = validateRows(raw, EnrollmentRow, "enrollment", ctx.log);
      const accumulators = new Map<string, EnrollmentAccumulator>();
      for (const row of ok) {
        if (row.AggregateLevel !== "S") continue;
        const cds = enrollmentCds(row);
        if (!inCounty(ctx, cds)) continue;
        let acc = accumulators.get(cds);
        if (!acc) {
          acc = startEnrollment(row);
          accumulators.set(cds, acc);
        }
        addEnrollmentRow(acc, row);
      }
      const rows: Enrollment[] = [];
      let withoutTotal = 0;
      for (const acc of accumulators.values()) {
        const finished = finishEnrollment(acc);
        if (finished) rows.push(finished);
        else withoutTotal += 1;
      }
      ctx.log(`  schools: ${rows.length}; without an all-students total: ${withoutTotal}`);
      const { rowsWritten, changed } = await upsertInBatches(
        ctx,
        internal.imports.upsertEnrollment,
        "rows",
        rows,
        "enrollment rows",
      );
      return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten, changed };
    });
  },
};
