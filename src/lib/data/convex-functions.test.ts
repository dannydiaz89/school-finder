import { convexTest } from "convex-test";
import { beforeAll, describe, expect, it } from "vitest";
import { api, internal } from "../../../convex/_generated/api";
import schema from "../../../convex/schema";
import { fixtures } from "@/fixtures";
import { summaryOf } from "@/lib/domain/records";
import {
  DEFAULT_SEARCH_FILTERS,
  type CaasppResult,
  type CdsCode,
  type SchoolDetail,
  type SchoolSummary,
  type SearchArgs,
} from "@/lib/schemas";
import { fixturesDataSource } from "./fixtures";

/**
 * The Convex functions, run in memory. No deployment, no network.
 *
 * Two things are checked. First, parity: with the fixture schools loaded
 * through the real import mutations, every query returns exactly what the
 * fixtures adapter returns. Second, thrift: an import says truthfully what
 * it changed, a re-run writes nothing, and only changed schools are
 * refreshed. Database bandwidth is the tight limit on the plan this runs on,
 * so those are behaviors, not niceties.
 */

const modules = import.meta.glob("../../../convex/**/*.ts");
const CENTER = { latitude: 38.5816, longitude: -121.4944 };
const JUDAH = "34674396034292" as CdsCode;

const harness = () => convexTest(schema, modules);
type Harness = ReturnType<typeof harness>;
type Upsert = { written: number; changed: string[] };

const records = fixtures.schools;
const allCaaspp: CaasppResult[] = [
  ...records.flatMap((r) => r.caaspp),
  ...Object.values(fixtures.districtCaaspp).flat(),
  ...fixtures.stateCaaspp,
];

/** Load every fixture record the way the import script does. Returns what each step reported. */
async function load(t: Harness) {
  const steps: Record<string, Upsert> = {
    schools: await t.mutation(internal.imports.upsertSchools, {
      schools: records.map((r) => r.school),
    }),
    dashboard: await t.mutation(internal.imports.upsertDashboard, {
      rows: records.flatMap((r) => r.dashboard),
    }),
    caaspp: await t.mutation(internal.imports.upsertCaaspp, { rows: allCaaspp }),
    enrollment: await t.mutation(internal.imports.upsertEnrollment, {
      rows: records.flatMap((r) => (r.enrollment ? [r.enrollment] : [])),
    }),
    frpm: await t.mutation(internal.imports.upsertFrpm, {
      rows: records.flatMap((r) => (r.frpm ? [r.frpm] : [])),
    }),
    staff: await t.mutation(internal.imports.upsertStaff, {
      rows: records.flatMap((r) => (r.staff ? [r.staff] : [])),
    }),
    privateDetails: await t.mutation(internal.imports.upsertPrivateDetails, {
      rows: records.flatMap((r) => (r.privateDetail ? [r.privateDetail] : [])),
    }),
  };
  return steps;
}

/** The schools whose search row an import run would refresh: everything but meals and test scores. */
const toRefresh = (steps: Record<string, Upsert>) => [
  ...new Set(
    ["schools", "dashboard", "enrollment", "staff", "privateDetails"].flatMap(
      (name) => steps[name].changed,
    ),
  ),
];

const round = (row: SchoolSummary) => ({
  ...row,
  distanceMeters: Math.round(row.distanceMeters * 1000) / 1000,
});

function normalize(detail: SchoolDetail | null) {
  if (!detail) return null;
  const key = (r: { year: string | number; indicator?: string; subject?: string }) =>
    `${r.year}-${r.indicator ?? r.subject}`;
  const sorted = <T extends { year: string | number }>(rows: T[]) =>
    [...rows].sort((a, b) => key(a).localeCompare(key(b)));
  return {
    ...detail,
    dashboard: sorted(detail.dashboard),
    caaspp: sorted(detail.caaspp),
    history: { dashboard: sorted(detail.history.dashboard), caaspp: sorted(detail.history.caaspp) },
    enrollment: detail.enrollment
      ? {
          ...detail.enrollment,
          byGrade: [...detail.enrollment.byGrade].sort((a, b) => a.grade.localeCompare(b.grade)),
        }
      : null,
  };
}

describe("Convex queries match the fixtures adapter", () => {
  let t: Harness;
  beforeAll(async () => {
    t = harness();
    const steps = await load(t);
    await t.mutation(internal.imports.rebuildSummariesFor, { cds: toRefresh(steps) });
  });

  const base: SearchArgs = {
    center: CENTER,
    radiusMiles: 4,
    filters: DEFAULT_SEARCH_FILTERS,
    sort: "distance",
    limit: 100,
    offset: 0,
  };
  const cases: [string, Partial<SearchArgs>][] = [
    ["defaults", {}],
    ["3 miles", { radiusMiles: 3 }],
    ["charter only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["charter"] } }],
    ["private only", { filters: { ...DEFAULT_SEARCH_FILTERS, types: ["private"] } }],
    ["tk band", { filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["tk"] } }],
    ["high band", { filters: { ...DEFAULT_SEARCH_FILTERS, gradeBands: ["high"] } }],
    ["with specialized", { filters: { ...DEFAULT_SEARCH_FILTERS, includeSpecialized: true } }],
    ["sorted by ELA", { sort: "ela" }],
    ["second page", { limit: 5, offset: 5 }],
  ];

  it.each(cases)("search: %s", async (_label, overrides) => {
    const args = { ...base, ...overrides };
    const expected = await fixturesDataSource.searchSchools(args);
    const actual = await t.query(api.schools.search, args);
    expect(actual.schools.map(round)).toEqual(expected.schools.map(round));
    expect(actual.total).toBe(expected.total);
    expect(actual.countsByType).toEqual(expected.countsByType);
    expect(actual.hiddenSpecialized).toBe(expected.hiddenSpecialized);
    expect(expected.total).toBeGreaterThan(0);
  });

  it("inRadius returns the same unfiltered rows", async () => {
    const args = { center: CENTER, radiusMiles: 5 };
    const expected = await fixturesDataSource.getSchoolsInRadius(args);
    const actual = await t.query(api.schools.inRadius, args);
    const byCds = (rows: SchoolSummary[]) =>
      rows.map(round).sort((a, b) => a.school.cds.localeCompare(b.school.cds));
    expect(byCds(actual.rows)).toEqual(byCds(expected.rows));
  });

  it("get returns the same detail for every school, with one year of district and state rows", async () => {
    for (const record of records) {
      const args = { cds: record.school.cds };
      expect(normalize(await t.query(api.schools.get, args))).toEqual(
        normalize(await fixturesDataSource.getSchool(args)),
      );
    }
    const judah = await t.query(api.schools.get, { cds: JUDAH });
    expect(judah?.caasppComparison?.year).toBe("2024-25");
    expect(judah?.caasppComparison?.ela.district).not.toBeNull();
    expect(judah?.caasppComparison?.ela.state).not.toBeNull();
    expect(await t.query(api.schools.get, { cds: "99999999999999" as CdsCode })).toBeNull();
  });

  it("nearby returns the same nearest schools, widening ring by ring", async () => {
    for (const record of records) {
      const args = { cds: record.school.cds, limit: 5 };
      expect((await t.query(api.schools.nearby, args)).map(round)).toEqual(
        (await fixturesDataSource.getNearby(args)).map(round),
      );
    }
  });

  it("nearby lists schools serving the same grades, not merely the closest ones", async () => {
    // Regression: a high school's page listed the five nearest schools, which were
    // elementary and middle schools.
    const mcclatchy = records.find((r) => r.school.name === "C. K. McClatchy High")!.school;
    const rows = await t.query(api.schools.nearby, { cds: mcclatchy.cds, limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const span = row.school.gradesServed ?? row.school.gradesOffered;
      // Every one of them teaches grade 12.
      expect(span?.high, row.school.name).toBe("12");
    }
    // Closer schools exist that are not alternatives to a high school.
    const farthest = Math.max(...rows.map((r) => r.distanceMeters));
    const all = await fixturesDataSource.getSchoolsInRadius({
      center: mcclatchy.coordinates!,
      radiusMiles: 25,
    });
    const skipped = all.rows.filter(
      (r) => r.distanceMeters < farthest && !rows.some((x) => x.school.cds === r.school.cds),
    );
    expect(skipped.length).toBeGreaterThan(5);
  });

  it("byCds and briefs keep the requested order and drop unknown codes", async () => {
    const cds = records.slice(0, 5).map((r) => r.school.cds);
    const args = { cds: [cds[3], cds[0], "99999999999999" as CdsCode, cds[4]] };
    expect((await t.query(api.schools.byCds, args)).map(normalize)).toEqual(
      (await fixturesDataSource.getSchoolsByCds(args)).map(normalize),
    );
    expect(await t.query(api.schools.briefs, args)).toEqual(
      await fixturesDataSource.getSchoolBriefs(args),
    );
  });
});

describe("imports spend as little as they can", () => {
  it("reports what it wrote, and a second run writes nothing", async () => {
    const t = harness();
    const first = await load(t);
    expect(first.schools.written).toBe(records.length);
    expect(first.dashboard.written).toBe(records.flatMap((r) => r.dashboard).length);
    expect(first.caaspp.written).toBe(allCaaspp.length);
    expect(new Set(first.schools.changed)).toEqual(new Set(records.map((r) => r.school.cds)));

    const second = await load(t);
    for (const [name, step] of Object.entries(second)) {
      expect(step, name).toEqual({ written: 0, changed: [] });
    }
  });

  it("names only the school whose row changed", async () => {
    const t = harness();
    await load(t);
    const rows = records.flatMap((r) => r.dashboard);
    const target = rows.find((r) => r.cds === JUDAH && r.indicator === "ela" && r.year === 2025)!;
    const edited = rows.map((r) => (r === target ? { ...r, status: 99.9 } : r));
    expect(await t.mutation(internal.imports.upsertDashboard, { rows: edited })).toEqual({
      written: 1,
      changed: [JUDAH],
    });
  });

  it("refreshes only the schools asked for, and only writes when a search row changed", async () => {
    const t = harness();
    const steps = await load(t);
    const all = toRefresh(steps);
    expect(await t.mutation(internal.imports.rebuildSummariesFor, { cds: all })).toEqual({
      examined: all.length,
      updated: all.length,
    });
    // Nothing changed since: every school is examined and none is written.
    expect(await t.mutation(internal.imports.rebuildSummariesFor, { cds: all })).toEqual({
      examined: all.length,
      updated: 0,
    });
    // The stored row is exactly what the domain computes from the school's records.
    const judah = records.find((r) => r.school.cds === JUDAH)!;
    const [brief] = await t.query(api.schools.briefs, { cds: [JUDAH] });
    expect({
      dashboard: brief.dashboard,
      enrollment: brief.enrollment,
      studentTeacherRatio: brief.studentTeacherRatio,
    }).toEqual(summaryOf(judah));
    // Unknown codes are skipped, not errors.
    expect(
      await t.mutation(internal.imports.rebuildSummariesFor, { cds: ["99999999999999"] }),
    ).toEqual({ examined: 1, updated: 0 });
  });

  it("does not rewrite a school whose directory entry is unchanged", async () => {
    // The directory lists Judah as K-6. With transitional kindergarten students enrolled the
    // stored span becomes TK-6. Importing the same directory again must not put K-6 back,
    // which used to rewrite every such school and then rewrite it again on refresh.
    const t = harness();
    const judah = records.find((r) => r.school.cds === JUDAH)!;
    const listed = { ...judah.school, gradesServed: { low: "K", high: "6" } as const };
    await t.mutation(internal.imports.upsertSchools, { schools: [listed] });
    await t.mutation(internal.imports.upsertEnrollment, { rows: [judah.enrollment!] });
    await t.mutation(internal.imports.rebuildSummariesFor, { cds: [JUDAH] });
    const span = async () =>
      (await t.query(api.schools.briefs, { cds: [JUDAH] }))[0].school.gradesServed;
    expect(await span()).toEqual({ low: "TK", high: "6" });

    expect(await t.mutation(internal.imports.upsertSchools, { schools: [listed] })).toEqual({
      written: 0,
      changed: [],
    });
    expect(await span()).toEqual({ low: "TK", high: "6" });

    // A real change to the listing is written and named.
    const moved = { ...listed, gradesServed: { low: "K", high: "8" } as const };
    expect(await t.mutation(internal.imports.upsertSchools, { schools: [moved] })).toEqual({
      written: 1,
      changed: [JUDAH],
    });
  });

  it("prunes per-grade test rows and keeps the all-grades row", async () => {
    const t = harness();
    const steps = await load(t);
    await t.mutation(internal.imports.rebuildSummariesFor, { cds: toRefresh(steps) });
    const before = await t.query(api.schools.get, { cds: JUDAH });
    const all = records
      .find((r) => r.school.cds === JUDAH)!
      .caaspp.find((r) => r.year === "2024-25" && r.subject === "ela")!;
    // Rows as the importer used to store them: one per tested grade.
    await t.mutation(internal.imports.upsertCaaspp, {
      rows: (["3", "4", "5"] as const).map((grade) => ({ ...all, grade })),
    });
    expect(
      await t.mutation(internal.imports.pruneCaasppGrades, { cds: [JUDAH], year: "2024-25" }),
    ).toBe(3);
    expect(
      await t.mutation(internal.imports.pruneCaasppGrades, { cds: [JUDAH], year: "2024-25" }),
    ).toBe(0);
    expect(normalize(await t.query(api.schools.get, { cds: JUDAH }))).toEqual(normalize(before));
  });
});
