/**
 * Import public school data into Convex.
 *
 *   pnpm import <source|all> [--year 2024-25] [--cache .cache] [--county Sacramento]
 *                            [--dry-run] [--batch 500] [--env .env.local]
 *
 * Sources: directory, dashboard, caaspp, enrollment, frpm, staff,
 * private-affidavit, private-pss, geo-index, all.
 *
 * Each source downloads its file into the cache (skipped when present),
 * validates every row with the Zod row schema in src/lib/schemas/imports,
 * transforms rows with the pure functions in src/lib/domain/imports, and
 * upserts through the internal mutations in convex/imports.ts. Every run is
 * recorded in the importRuns table. Nothing here runs at request time.
 *
 * Credentials: CONVEX_DEPLOY_KEY, or the CLI login from `npx convex login`.
 */
import { parseArgs } from "node:util";
import { countyCode } from "../src/lib/domain/imports/counties";
import { adminClient } from "./lib/convex-admin";
import { normalizeYearArg, type ImportContext } from "./lib/runner";
import { caaspp } from "./sources/caaspp";
import { dashboard } from "./sources/dashboard";
import { directory } from "./sources/directory";
import { enrollment } from "./sources/enrollment";
import { frpm } from "./sources/frpm";
import { geoIndex } from "./sources/geo-index";
import { privateAffidavit, privatePss } from "./sources/private";
import { staff } from "./sources/staff";
import type { Source } from "./sources/types";

const SOURCES: Source[] = [
  directory,
  dashboard,
  caaspp,
  enrollment,
  frpm,
  staff,
  privateAffidavit,
  privatePss,
];

function usage(): never {
  console.error(
    `Usage: pnpm import <${[...SOURCES.map((s) => s.name), geoIndex.name, "all"].join("|")}> ` +
      `[--year 2024-25] [--cache .cache] [--county Sacramento] [--dry-run] [--batch 500]`,
  );
  process.exit(2);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      year: { type: "string" },
      cache: { type: "string", default: ".cache" },
      county: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      batch: { type: "string", default: "500" },
      env: { type: "string", default: ".env.local" },
    },
  });
  const [name] = positionals;
  if (!name) usage();
  const selected = name === "all" ? SOURCES : [...SOURCES, geoIndex].filter((s) => s.name === name);
  if (selected.length === 0) usage();
  if (name === "all" && values.year) {
    console.error("--year applies to one source at a time; each source has its own default year.");
    process.exit(2);
  }

  const county = values.county ? countyCode(values.county) : undefined;
  if (values.county && !county) {
    console.error(`Unknown county ${values.county}`);
    process.exit(2);
  }

  const { client, target } = await adminClient(values.env);
  const ctx: ImportContext = {
    client,
    cacheDir: values.cache,
    year: normalizeYearArg(values.year),
    county,
    dryRun: values["dry-run"],
    batchSize: Math.max(1, Number(values.batch) || 500),
    log: (message) => console.error(message),
  };
  ctx.log(
    `Importing ${selected.map((s) => s.name).join(", ")} into ${target.name} (${target.url})` +
      `${county ? ` for county ${county}` : ""}${ctx.dryRun ? " [dry run]" : ""}`,
  );

  const summary: Record<string, { rowsRead: number; rowsRejected: number; rowsWritten: number }> =
    {};
  for (const source of selected) {
    const started = Date.now();
    summary[source.name] = await source.run(ctx);
    ctx.log(`   ${source.name} took ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  console.table(summary);
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
