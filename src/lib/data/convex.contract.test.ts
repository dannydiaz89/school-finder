import { beforeAll, describe, expect, it } from "vitest";
import { internal } from "../../../convex/_generated/api";
import { adminClient, readEnvFile } from "../../../scripts/lib/convex-admin";
import { fixtures } from "@/fixtures";
import { chunk } from "@/lib/domain/imports/common";
import {
  DEFAULT_SEARCH_FILTERS,
  type SchoolDetail,
  type SchoolSummary,
  type SearchArgs,
} from "@/lib/schemas";
import { resetEnvForTests } from "@/lib/schemas/env";
import type { SchoolDataSource } from "./index";

/**
 * Contract test: the Convex adapter must return exactly what the fixtures
 * adapter returns for the same arguments, once the fixture records are the
 * only data in the deployment.
 *
 * It needs a deployment and credentials, so it is skipped unless
 * CONVEX_CONTRACT_TESTS=1. It EMPTIES the data tables of the deployment in
 * .env.local (the dev deployment) and loads the 40 fixture schools; run
 * `pnpm run import all` afterwards to restore real data. See
 * docs/data-sources.md, "Running the contract test".
 */

const enabled = process.env.CONVEX_CONTRACT_TESTS === "1";
const CENTER = { latitude: 38.5816, longitude: -121.4944 };
const TABLES = [
  "schools",
  "dashboard",
  "caaspp",
  "enrollment",
  "frpm",
  "staffRatios",
  "privateDetails",
] as const;

const baseArgs: SearchArgs = {
  center: CENTER,
  radiusMiles: 3,
  filters: DEFAULT_SEARCH_FILTERS,
  sort: "distance",
  limit: 100,
  offset: 0,
};

const searchCases: [string, Partial<SearchArgs>][] = [
  ["defaults, 3 miles", {}],
  ["4 miles", { radiusMiles: 4 }],
  ["district only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["district"] } }],
  ["charter only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["charter"] } }],
  ["private only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["private"] } }],
  ["tk band", { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["tk"] } }],
  [
    "elementary band",
    { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["elementary"] } },
  ],
  [
    "middle band",
    { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["middle"] } },
  ],
  ["high band", { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["high"] } }],
  [
    "rating at least yellow",
    { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, minElaLevel: "yellow" } },
  ],
  [
    "include specialized",
    { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, includeSpecialized: true } },
  ],
  [
    "catholic",
    { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, affiliations: ["catholic"] } },
  ],
  [
    "max enrollment 500",
    { radiusMiles: 4, filters: { ...DEFAULT_SEARCH_FILTERS, maxEnrollment: 500 } },
  ],
  ["sort ela", { radiusMiles: 4, sort: "ela" }],
  ["sort math", { radiusMiles: 4, sort: "math" }],
  ["sort enrollment", { radiusMiles: 4, sort: "enrollment" }],
  ["page 2 of 5", { radiusMiles: 4, limit: 5, offset: 5 }],
];

/** Order-insensitive view of a record's arrays, and distances rounded to the millimetre. */
function normalizeSummary(row: SchoolSummary) {
  return { ...row, distanceMeters: Math.round(row.distanceMeters * 1000) / 1000 };
}

function normalizeDetail(detail: SchoolDetail | null) {
  if (!detail) return null;
  const key = (r: { indicator?: string; subject?: string; grade?: string }) =>
    `${r.indicator ?? r.subject}-${r.grade ?? ""}`;
  return {
    ...detail,
    dashboard: [...detail.dashboard].sort((a, b) => key(a).localeCompare(key(b))),
    caaspp: [...detail.caaspp].sort((a, b) => key(a).localeCompare(key(b))),
    enrollment: detail.enrollment
      ? {
          ...detail.enrollment,
          byGrade: [...detail.enrollment.byGrade].sort((a, b) => a.grade.localeCompare(b.grade)),
        }
      : null,
  };
}

describe.skipIf(!enabled)("Convex adapter matches the fixtures adapter", () => {
  let convex: SchoolDataSource;
  let fixturesSource: SchoolDataSource;

  beforeAll(async () => {
    const env = readEnvFile(".env.local");
    process.env.NEXT_PUBLIC_CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL;
    resetEnvForTests();
    const { client, target } = await adminClient(".env.local");
    console.log(`Loading fixtures into ${target.name}`);

    for (const table of TABLES) {
      while ((await client.mutation(internal.imports.clearAll, { table })) > 0) {
        /* keep deleting pages */
      }
    }
    const records = fixtures.schools;
    for (const batch of chunk(
      records.map((r) => r.school),
      100,
    )) {
      await client.mutation(internal.imports.upsertSchools, { schools: batch });
    }
    await client.mutation(internal.imports.upsertDashboard, {
      rows: records.flatMap((r) => r.dashboard),
    });
    const caaspp = [
      ...records.flatMap((r) => r.caaspp),
      ...Object.values(fixtures.districtCaaspp).flat(),
      ...fixtures.stateCaaspp,
    ];
    for (const batch of chunk(caaspp, 500)) {
      await client.mutation(internal.imports.upsertCaaspp, { rows: batch });
    }
    await client.mutation(internal.imports.upsertEnrollment, {
      rows: records.flatMap((r) => (r.enrollment ? [r.enrollment] : [])),
    });
    await client.mutation(internal.imports.upsertFrpm, {
      rows: records.flatMap((r) => (r.frpm ? [r.frpm] : [])),
    });
    await client.mutation(internal.imports.upsertStaff, {
      rows: records.flatMap((r) => (r.staff ? [r.staff] : [])),
    });
    await client.mutation(internal.imports.upsertPrivateDetails, {
      rows: records.flatMap((r) => (r.privateDetail ? [r.privateDetail] : [])),
    });
    // Search reads the precomputed summary, so build it the way an import does.
    let cursor: string | null = null;
    do {
      const page: { cursor: string | null } = await client.mutation(
        internal.imports.rebuildSummaries,
        { cursor, pageSize: 100 },
      );
      cursor = page.cursor;
    } while (cursor !== null);

    convex = (await import("./convex")).convexDataSource;
    fixturesSource = (await import("./fixtures")).fixturesDataSource;
  }, 120_000);

  it.each(searchCases)("searchSchools: %s", async (_label, overrides) => {
    const args = { ...baseArgs, ...overrides };
    const expected = await fixturesSource.searchSchools(args);
    const actual = await convex.searchSchools(args);
    expect(actual.schools.map(normalizeSummary)).toEqual(expected.schools.map(normalizeSummary));
    expect(actual.total).toBe(expected.total);
    expect(actual.countsByType).toEqual(expected.countsByType);
    expect(actual.hiddenSpecialized).toBe(expected.hiddenSpecialized);
    expect(expected.total).toBeGreaterThan(0);
  });

  it("getSchool returns the same detail for every fixture school", async () => {
    for (const record of fixtures.schools) {
      const args = { cds: record.school.cds };
      expect(normalizeDetail(await convex.getSchool(args))).toEqual(
        normalizeDetail(await fixturesSource.getSchool(args)),
      );
    }
  }, 60_000);

  it("getSchool returns null for an unknown cds", async () => {
    expect(await convex.getSchool({ cds: "99999999999999" as never })).toBeNull();
  });

  it("getNearby returns the same rows", async () => {
    for (const record of fixtures.schools.slice(0, 12)) {
      const args = { cds: record.school.cds, limit: 6 };
      expect((await convex.getNearby(args)).map(normalizeSummary)).toEqual(
        (await fixturesSource.getNearby(args)).map(normalizeSummary),
      );
    }
  }, 60_000);

  it("getSchoolsByCds keeps the requested order and drops unknown codes", async () => {
    const cds = fixtures.schools.slice(0, 5).map((r) => r.school.cds);
    const args = { cds: [cds[3], cds[0], "99999999999999" as never, cds[4]] };
    const expected = await fixturesSource.getSchoolsByCds(args);
    const actual = await convex.getSchoolsByCds(args);
    expect(actual.map(normalizeDetail)).toEqual(expected.map(normalizeDetail));
    expect(actual.map((d) => d.school.cds)).toEqual([cds[3], cds[0], cds[4]]);
  });

  it("getSchoolBriefs returns the same rows in the requested order", async () => {
    const cds = fixtures.schools.slice(0, 6).map((r) => r.school.cds);
    const args = { cds: [cds[5], cds[1], "99999999999999" as never, cds[2]] };
    const strip = <T extends { school: unknown }>(row: T) => ({
      ...normalizeSummary({ ...row, distanceMeters: 0 } as never),
      distanceMeters: undefined,
    });
    expect((await convex.getSchoolBriefs(args)).map(strip)).toEqual(
      (await fixturesSource.getSchoolBriefs(args)).map(strip),
    );
  });
});
