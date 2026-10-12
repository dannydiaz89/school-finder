import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import {
  DASHBOARD_FILE_NAMES,
  dashboardIndicatorFromRow,
  isSchoolAllStudentsRow,
} from "../../src/lib/domain/imports/dashboard";
import { DASHBOARD_INDICATORS, type DashboardIndicator } from "../../src/lib/schemas";
import { DashboardRow } from "../../src/lib/schemas/imports/dashboard";
import { ensureFile } from "../lib/cache";
import { readDelimited } from "../lib/parse";
import { endYear, inCounty, recordRun, upsertInBatches, validateRows } from "../lib/runner";
import type { Source } from "./types";

export const DASHBOARD_BASE = "https://www3.cde.ca.gov/researchfiles/cadashboard/";

/** Indicators the state started publishing after 2023; earlier years have no file. */
const INDICATOR_FIRST_YEAR: Partial<Record<(typeof DASHBOARD_INDICATORS)[number], number>> = {
  science: 2024,
};

/** Every indicator file for one Dashboard year, one importRuns record per file. */
export const dashboard: Source = {
  name: "dashboard",
  defaultYear: "2024-25",
  async run(ctx) {
    const year = endYear(ctx.year ?? this.defaultYear);
    const totals = { rowsRead: 0, rowsRejected: 0, rowsWritten: 0 };
    if (ctx.indicator && !DASHBOARD_INDICATORS.some((id) => id === ctx.indicator)) {
      throw new Error(
        `--indicator must be one of ${DASHBOARD_INDICATORS.join(", ")}, got ${ctx.indicator}`,
      );
    }
    for (const indicator of DASHBOARD_INDICATORS) {
      if (ctx.indicator && indicator !== ctx.indicator) continue;
      const firstYear = INDICATOR_FIRST_YEAR[indicator];
      if (firstYear !== undefined && year < firstYear) {
        ctx.log(`== dashboard:${indicator} (${year}) skipped: first published in ${firstYear}`);
        continue;
      }
      const file = DASHBOARD_FILE_NAMES[indicator](year);
      const url = DASHBOARD_BASE + file;
      const path = join(ctx.cacheDir, "dashboard", String(year), file);
      await ensureFile(url, path, { log: ctx.log });
      const counts = await recordRun(
        ctx,
        { source: `dashboard:${indicator}`, url, year: String(year) },
        async () => {
          const raw = readDelimited(path, "\t");
          const { ok, rejected } = validateRows(raw, DashboardRow, indicator, ctx.log);
          const rows: DashboardIndicator[] = [];
          for (const row of ok) {
            if (!isSchoolAllStudentsRow(row) || !inCounty(ctx, row.cds)) continue;
            rows.push(dashboardIndicatorFromRow(row));
          }
          ctx.log(`  ${indicator}: ${rows.length} school rows`);
          const rowsWritten = await upsertInBatches(
            ctx,
            internal.imports.upsertDashboard,
            "rows",
            rows,
            `${indicator} rows`,
          );
          return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten };
        },
      );
      totals.rowsRead += counts.rowsRead;
      totals.rowsRejected += counts.rowsRejected;
      totals.rowsWritten += counts.rowsWritten;
    }
    return totals;
  },
};
