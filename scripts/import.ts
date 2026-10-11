/**
 * Import entry point. The Data workstream fills this in: download each source
 * listed in docs/data-sources.md into .cache/, validate rows with the schemas
 * in src/lib/schemas/imports/, and upsert through the Convex adapter.
 *
 *   pnpm import directory
 *   pnpm import dashboard --year 2025
 *   pnpm import all
 *
 * Until then this prints usage and exits non-zero so nothing silently
 * pretends to have imported data.
 */
const SOURCES = [
  "directory",
  "dashboard",
  "caaspp",
  "enrollment",
  "frpm",
  "staff",
  "private-affidavit",
  "private-pss",
  "all",
] as const;

const [source] = process.argv.slice(2);
console.error(`import: "${source ?? ""}" is not implemented yet. Sources: ${SOURCES.join(", ")}`);
console.error(
  "See docs/PLAN.md, workstream B (Data), and scripts/build-fixtures.ts for the parsing already done.",
);
process.exit(2);
