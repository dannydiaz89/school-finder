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

/**
 * Every indicator file for one Dashboard year.
 *
 * All files are parsed first and written in one pass ordered by school. A
 * write starts by reading what is stored for that school and year, so
 * writing file by file made the eighth file re-read the rows of the seven
 * before it: twenty-eight row reads per school to store eight. In one pass a
 * school's rows arrive together and its stored rows are read once.
 */
export const dashboard: Source = {
  name: "dashboard",
  defaultYear: "2024-25",
  async run(ctx) {
    const year = endYear(ctx.year ?? this.defaultYear);
    if (ctx.indicator && !DASHBOARD_INDICATORS.some((id) => id === ctx.indicator)) {
      throw new Error(
        `--indicator must be one of ${DASHBOARD_INDICATORS.join(", ")}, got ${ctx.indicator}`,
      );
    }
    const source = ctx.indicator ? `dashboard:${ctx.indicator}` : "dashboard";
    return recordRun(ctx, { source, url: DASHBOARD_BASE, year: String(year) }, async () => {
      const rows: DashboardIndicator[] = [];
      let rowsRead = 0;
      let rowsRejected = 0;
      for (const indicator of DASHBOARD_INDICATORS) {
        if (ctx.indicator && indicator !== ctx.indicator) continue;
        const firstYear = INDICATOR_FIRST_YEAR[indicator];
        if (firstYear !== undefined && year < firstYear) {
          ctx.log(`  ${indicator} (${year}) skipped: first published in ${firstYear}`);
          continue;
        }
        const file = DASHBOARD_FILE_NAMES[indicator](year);
        const path = join(ctx.cacheDir, "dashboard", String(year), file);
        await ensureFile(DASHBOARD_BASE + file, path, { log: ctx.log });
        const raw = readDelimited(path, "\t");
        const { ok, rejected } = validateRows(raw, DashboardRow, indicator, ctx.log);
        let kept = 0;
        for (const row of ok) {
          if (!isSchoolAllStudentsRow(row) || !inCounty(ctx, row.cds)) continue;
          rows.push(dashboardIndicatorFromRow(row));
          kept += 1;
        }
        // A file that yields no school rows usually means its layout changed.
        ctx.log(
          `  ${indicator}: ${kept} school rows of ${raw.length}${kept === 0 ? "  <-- none" : ""}`,
        );
        rowsRead += raw.length;
        rowsRejected += rejected;
      }
      rows.sort((a, b) => (a.cds < b.cds ? -1 : a.cds > b.cds ? 1 : 0));
      const { rowsWritten, changed } = await upsertInBatches(
        ctx,
        internal.imports.upsertDashboard,
        "rows",
        rows,
        "dashboard rows",
      );
      // A search row shows a school's newest year only, so rows for an earlier year
      // cannot change it and those schools need no refresh.
      const feedsSearchRows = year >= endYear(this.defaultYear);
      return { rowsRead, rowsRejected, rowsWritten, changed: feedsSearchRows ? changed : [] };
    });
  },
};
