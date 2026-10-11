/**
 * Spot-check imported Dashboard values against caschooldashboard.org.
 *
 *   pnpm tsx scripts/spot-check.ts [--year 2025] [--cds 34752830135194,...] [--env .env.local]
 *
 * For each school it reads our `schools:get` query and the Dashboard site's
 * own JSON (the undocumented API behind the SPA, used only as a cross-check)
 * and compares status, change and performance level per indicator. Exits 1
 * when any value disagrees. Without --cds it checks the public fixture
 * schools.
 */
import { parseArgs } from "node:util";
import { z } from "zod";
import { api } from "../convex/_generated/api";
import { fixtures } from "../src/fixtures";
import { DASHBOARD_LEVELS, type DashboardIndicatorId, SchoolDetail } from "../src/lib/schemas";
import { adminClient } from "./lib/convex-admin";

const DASHBOARD_API = "https://api.caschooldashboard.org";

/** Dashboard API indicator ids, read off the SummaryCards response. */
const API_INDICATORS: Record<number, DashboardIndicatorId> = {
  1: "chronicAbsenteeism",
  2: "suspension",
  3: "elpi",
  4: "graduation",
  5: "collegeCareer",
  6: "ela",
  7: "math",
  8: "science",
};

const SchoolYears = z.array(z.object({ schoolYearId: z.number(), year: z.number() }).loose());
const SummaryCards = z.array(
  z
    .object({
      indicatorId: z.number(),
      primary: z
        .object({
          status: z
            .number()
            .nullish()
            .transform((v) => v ?? null),
          change: z
            .number()
            .nullish()
            .transform((v) => v ?? null),
          performance: z
            .number()
            .nullish()
            .transform((v) => v ?? null),
          count: z
            .number()
            .nullish()
            .transform((v) => v ?? null),
          changeId: z
            .number()
            .nullish()
            .transform((v) => v ?? null),
        })
        .loose()
        .nullable(),
    })
    .loose(),
);

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(DASHBOARD_API + path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

const near = (a: number | null, b: number | null) =>
  a === null || b === null ? a === b : Math.abs(a - b) < 0.051;

async function main() {
  const { values } = parseArgs({
    options: {
      year: { type: "string", default: "2025" },
      cds: { type: "string" },
      env: { type: "string", default: ".env.local" },
    },
  });
  const year = Number(values.year);
  const codes = values.cds
    ? values.cds.split(",").map((c) => c.trim())
    : fixtures.schools.filter((r) => r.school.type !== "private").map((r) => r.school.cds);

  const years = SchoolYears.parse(await getJson("/LEAs/schoolYears"));
  const schoolYearId = years.find((y) => y.year === year)?.schoolYearId;
  if (!schoolYearId) throw new Error(`Dashboard API has no year ${year}`);

  const { client, target } = await adminClient(values.env);
  console.error(`Checking ${codes.length} schools in ${target.name} against ${DASHBOARD_API}`);

  let compared = 0;
  let mismatches = 0;
  const rows: Record<string, string>[] = [];
  for (const cds of codes) {
    const raw = await client.query(api.schools.get, { cds: cds as never });
    if (!raw) {
      rows.push({ cds, name: "(not in Convex)", result: "missing" });
      mismatches += 1;
      continue;
    }
    const ours = SchoolDetail.parse(raw);
    const cards = SummaryCards.parse(await getJson(`/Reports/${cds}/${schoolYearId}/SummaryCards`));
    const problems: string[] = [];
    let checked = 0;
    for (const card of cards) {
      const id = API_INDICATORS[card.indicatorId];
      if (!id || !card.primary) continue;
      const theirs = card.primary;
      const mine = ours.dashboard.find((d) => d.indicator === id && d.year === year);
      if (!mine) {
        if (theirs.status !== null) problems.push(`${id}: missing (site ${theirs.status})`);
        continue;
      }
      checked += 1;
      const level = theirs.performance ? DASHBOARD_LEVELS[theirs.performance - 1] : null;
      if (!near(mine.status, theirs.status))
        problems.push(`${id} status ${mine.status} vs ${theirs.status}`);
      // The site serializes a blank change (n-size not met) as 0 with no change level.
      const theirChange = theirs.change === 0 && !theirs.changeId ? null : theirs.change;
      if (!near(mine.change, theirChange))
        problems.push(`${id} change ${mine.change} vs ${theirChange}`);
      if (mine.level !== level) problems.push(`${id} level ${mine.level} vs ${level}`);
    }
    compared += checked;
    if (problems.length) mismatches += 1;
    rows.push({
      cds,
      name: ours.school.name,
      indicators: String(checked),
      result: problems.length ? problems.join("; ") : "ok",
    });
  }
  console.table(rows);
  console.error(`${compared} indicator values compared, ${mismatches} schools with differences`);
  process.exit(mismatches ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
