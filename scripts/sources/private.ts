import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { internal } from "../../convex/_generated/api";
import {
  affidavitSchoolFromRow,
  type AffidavitSchool,
} from "../../src/lib/domain/imports/affidavit";
import {
  matchPrivateSchools,
  pssState,
  schoolFromPrivateMatch,
} from "../../src/lib/domain/imports/pss";
import type { PrivateSchoolDetail, School } from "../../src/lib/schemas";
import { AffidavitRow } from "../../src/lib/schemas/imports/affidavit";
import { PssRow } from "../../src/lib/schemas/imports/pss";
import { ensureFile } from "../lib/cache";
import { readDelimited, readSheet } from "../lib/parse";
import {
  inCounty,
  recordRun,
  upsertInBatches,
  validateRows,
  yearSuffix,
  type ImportContext,
} from "../lib/runner";
import type { Source } from "./types";

/**
 * Private schools come from two files. The CDE affidavit has the CDS code
 * and the counts; the NCES Private School Survey has the address,
 * coordinates and affiliation. `private-affidavit` writes privateDetails for
 * every affidavit row; `private-pss` joins the two and writes School rows for
 * the ones it can place on the map.
 */

const AFFIDAVIT_YEAR = "2024-25";
const PSS_YEAR = "2023-24";

function affidavitUrl(year: string) {
  return `https://www.cde.ca.gov/ds/si/ps/documents/privateschooldata${yearSuffix(year)}.xlsx`;
}

async function firstSheetName(path: string): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  return workbook.worksheets[0].name;
}

async function loadAffidavit(
  ctx: ImportContext,
  year: string,
): Promise<{ schools: AffidavitSchool[]; rowsRead: number; rowsRejected: number }> {
  const url = affidavitUrl(year);
  const path = join(ctx.cacheDir, "private-affidavit", `privateschooldata${yearSuffix(year)}.xlsx`);
  await ensureFile(url, path, { log: ctx.log });
  const raw = await readSheet(path, await firstSheetName(path), 6);
  const { ok, rejected } = validateRows(raw, AffidavitRow, "affidavit", ctx.log);
  const schools = ok
    .map((row) => affidavitSchoolFromRow(row, year))
    .filter((s) => inCounty(ctx, s.cds));
  return { schools, rowsRead: raw.length, rowsRejected: rejected };
}

export const privateAffidavit: Source = {
  name: "private-affidavit",
  defaultYear: AFFIDAVIT_YEAR,
  async run(ctx) {
    const year = ctx.year ?? this.defaultYear;
    return recordRun(
      ctx,
      { source: "private-affidavit", url: affidavitUrl(year), year },
      async () => {
        const { schools, rowsRead, rowsRejected } = await loadAffidavit(ctx, year);
        const rows: PrivateSchoolDetail[] = schools.map((s) => s.detail);
        ctx.log(`  affidavit schools: ${rows.length}`);
        const rowsWritten = await upsertInBatches(
          ctx,
          internal.imports.upsertPrivateDetails,
          "rows",
          rows,
          "private details",
        );
        return { rowsRead, rowsRejected, rowsWritten };
      },
    );
  },
};

export const privatePss: Source = {
  name: "private-pss",
  defaultYear: PSS_YEAR,
  async run(ctx) {
    const year = ctx.year ?? this.defaultYear;
    const base = `pss${yearSuffix(year)}_pu`;
    const url = `https://nces.ed.gov/surveys/pss/zip/${base}_csv.zip`;
    const path = join(ctx.cacheDir, "private-pss", `${base}.csv`);
    await ensureFile(url, path, { log: ctx.log, member: /\.csv$/i });

    return recordRun(ctx, { source: "private-pss", url, year }, async () => {
      const affidavit = await loadAffidavit(ctx, AFFIDAVIT_YEAR);
      const raw = readDelimited(path, ",");
      const { ok, rejected } = validateRows(raw, PssRow, "pss", ctx.log);
      const california = ok.filter((row) => pssState(row) === "CA");
      ctx.log(
        `  PSS rows in California: ${california.length}; affidavit schools: ${affidavit.schools.length}`,
      );

      const overrideRows = await ctx.client.query(internal.imports.listPrivateOverrides, {});
      const overrides = new Map(overrideRows.map((o) => [o.cds, o.pssId]));
      ctx.log(`  overrides: ${overrides.size}`);

      const matches = matchPrivateSchools(affidavit.schools, california, overrides);
      const schools: School[] = [];
      const report: string[] = ["cds\tname\tcounty\tstatus\tconfidence\tpss_id\tpss_name"];
      const summary: Record<string, number> = {};
      for (const m of matches) {
        if (m.kind === "matched") {
          const school = schoolFromPrivateMatch(m.affidavit, m.pss);
          const status = school ? (m.confidence < 1 ? "fuzzy" : "matched") : "noAddress";
          summary[status] = (summary[status] ?? 0) + 1;
          if (school) schools.push(school);
          report.push(
            [
              m.affidavit.cds,
              m.affidavit.name,
              m.affidavit.county,
              status,
              m.confidence.toFixed(2),
              m.pss.PPIN,
              m.pss.PINST,
            ].join("\t"),
          );
        } else {
          summary[m.reason] = (summary[m.reason] ?? 0) + 1;
          report.push(
            [
              m.affidavit.cds,
              m.affidavit.name,
              m.affidavit.county,
              `unmatched:${m.reason}`,
              m.best ? m.best.score.toFixed(2) : "",
              m.best?.pss.PPIN ?? "",
              m.best?.pss.PINST ?? "",
            ].join("\t"),
          );
        }
      }
      const reportPath = join(ctx.cacheDir, "private-pss", `match-report-${yearSuffix(year)}.tsv`);
      writeFileSync(reportPath, report.join("\n") + "\n");
      ctx.log(`  match summary: ${JSON.stringify(summary)} (details in ${reportPath})`);

      const rowsWritten = await upsertInBatches(
        ctx,
        internal.imports.upsertSchools,
        "schools",
        schools,
        "private schools",
        Math.min(ctx.batchSize, 150),
      );
      return {
        rowsRead: raw.length + affidavit.rowsRead,
        rowsRejected: rejected + affidavit.rowsRejected,
        rowsWritten,
      };
    });
  },
};
