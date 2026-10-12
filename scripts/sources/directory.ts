import { existsSync } from "node:fs";
import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import { schoolFromDirectoryRow } from "../../src/lib/domain/imports/directory";
import { frpmCds } from "../../src/lib/domain/imports/frpm";
import { DirectoryRow } from "../../src/lib/schemas/imports/directory";
import { FrpmRow } from "../../src/lib/schemas/imports/frpm";
import { ensureFile } from "../lib/cache";
import { readDelimited, readSheet } from "../lib/parse";
import { inCounty, recordRun, upsertInBatches, validateRows, yearSuffix } from "../lib/runner";
import type { Source } from "./types";

/**
 * CDE public school directory. The report endpoint sits behind bot
 * protection, so the download usually fails and the file must be saved by
 * hand to .cache/directory/pubschls.txt (see docs/data-sources.md).
 */
export const DIRECTORY_URL = "https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt";
export const FRPM_YEAR_FOR_OPTIONS = "2024-25";

export const directory: Source = {
  name: "directory",
  defaultYear: "",
  async run(ctx) {
    const path = join(ctx.cacheDir, "directory", "pubschls.txt");
    await ensureFile(DIRECTORY_URL, path, { log: ctx.log });

    // The directory leaves EdOpsCode blank for some schools; FRPM names the option in words.
    const frpmPath = join(
      ctx.cacheDir,
      "frpm",
      `frpm${yearSuffix(ctx.year ?? FRPM_YEAR_FOR_OPTIONS)}.xlsx`,
    );
    const frpmOption = new Map<string, string>();
    if (existsSync(frpmPath)) {
      const frpm = validateRows(
        await readSheet(frpmPath, "FRPM School-Level Data", 2),
        FrpmRow,
        "frpm",
        ctx.log,
      );
      for (const row of frpm.ok) {
        const option = row["Educational Option Type"];
        if (option) frpmOption.set(frpmCds(row), option);
      }
      ctx.log(`  educational options from FRPM: ${frpmOption.size}`);
    } else {
      ctx.log(`  ${frpmPath} not cached; schools without EdOpsCode keep no educational option`);
    }

    return recordRun(ctx, { source: "directory", url: DIRECTORY_URL, year: "" }, async () => {
      const raw = readDelimited(path, "\t");
      const { ok, rejected } = validateRows(raw, DirectoryRow, "directory", ctx.log);
      const skipped: Record<string, number> = {};
      const schools = [];
      for (const row of ok) {
        if (!inCounty(ctx, row.CDSCode)) continue;
        const out = schoolFromDirectoryRow(row, frpmOption.get(row.CDSCode));
        if (out.kind === "skip") {
          skipped[out.reason] = (skipped[out.reason] ?? 0) + 1;
          continue;
        }
        schools.push(out.school);
      }
      ctx.log(`  skipped: ${JSON.stringify(skipped)}; schools to write: ${schools.length}`);
      const withoutCoordinates = schools.filter((s) => !s.coordinates).length;
      if (withoutCoordinates) ctx.log(`  ${withoutCoordinates} schools have no coordinates`);
      const { rowsWritten, changed } = await upsertInBatches(
        ctx,
        internal.imports.upsertSchools,
        "schools",
        schools,
        "schools",
        Math.min(ctx.batchSize, 150),
      );
      return { rowsRead: raw.length, rowsRejected: rejected, rowsWritten, changed };
    });
  },
};
