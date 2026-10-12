import {
  countByType,
  isSpecializedPlacement,
  matchesFilters,
  sortRows,
} from "@/lib/domain/filters";
import { milesToMeters } from "@/lib/domain/geo";
import { rankByName } from "@/lib/domain/names";
import { summaryOf, toDetail, toSummary } from "@/lib/domain/records";
import { fixtures } from "@/fixtures";
import type {
  GetSchoolArgs,
  GetSchoolBriefsArgs,
  GetSchoolsByCdsArgs,
  NameMatch,
  NameSearchArgs,
  NearbyArgs,
  RadiusArgs,
  RadiusRows,
  SchoolBrief,
  SchoolDetail,
  SchoolRecord,
  SchoolSummary,
  SearchArgs,
  SearchResult,
} from "@/lib/schemas";
import type { SchoolDataSource } from "./index";

/**
 * In-memory backend over the fixture file. This is what UI workstreams build
 * against, and it doubles as the reference implementation: the Convex adapter
 * must return the same rows for the same arguments.
 */

const byCds = new Map<string, SchoolRecord>(fixtures.schools.map((r) => [r.school.cds, r]));

function detail(record: SchoolRecord): SchoolDetail {
  const districtRows = fixtures.districtCaaspp[record.school.districtCds ?? ""] ?? [];
  return toDetail(record, districtRows, fixtures.stateCaaspp);
}

export const fixturesDataSource: SchoolDataSource = {
  async searchSchools(args: SearchArgs): Promise<SearchResult> {
    const radiusMeters = milesToMeters(args.radiusMiles);
    const inRadius: SchoolSummary[] = fixtures.schools
      .map((r) => toSummary(r, args.center))
      .filter((row) => row.distanceMeters <= radiusMeters);

    const hiddenSpecialized = args.filters.includeSpecialized
      ? 0
      : inRadius.filter((row) => isSpecializedPlacement(row.school)).length;

    const matched = sortRows(
      inRadius.filter((row) => matchesFilters(row, args.filters)),
      args.sort,
    );

    return {
      schools: matched.slice(args.offset, args.offset + args.limit),
      total: matched.length,
      countsByType: countByType(
        inRadius.filter(
          (row) => args.filters.includeSpecialized || !isSpecializedPlacement(row.school),
        ),
      ),
      hiddenSpecialized,
      truncated: false,
    };
  },

  async getSchool(args: GetSchoolArgs): Promise<SchoolDetail | null> {
    const record = byCds.get(args.cds);
    return record ? detail(record) : null;
  },

  async getNearby(args: NearbyArgs): Promise<SchoolSummary[]> {
    const record = byCds.get(args.cds);
    const center = record?.school.coordinates;
    if (!record || !center) return [];
    return fixtures.schools
      .filter((r) => r.school.cds !== args.cds && !isSpecializedPlacement(r.school))
      .map((r) => toSummary(r, center))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, args.limit);
  },

  async getSchoolsByCds(args: GetSchoolsByCdsArgs): Promise<SchoolDetail[]> {
    return args.cds
      .map((cds) => byCds.get(cds))
      .filter((r): r is SchoolRecord => r !== undefined)
      .map(detail);
  },

  async getSchoolsInRadius(args: RadiusArgs): Promise<RadiusRows> {
    const radiusMeters = milesToMeters(args.radiusMiles);
    const rows = fixtures.schools
      .map((r) => toSummary(r, args.center))
      .filter((row) => row.distanceMeters <= radiusMeters);
    return { rows, truncated: false };
  },

  async findSchoolsByName(args: NameSearchArgs): Promise<NameMatch[]> {
    return rankByName(
      fixtures.schools,
      args.query,
      (r) => r.school.name,
      (r) => `${r.school.address.city} ${r.school.district}`,
    )
      .slice(0, args.limit)
      .map((r) => ({ school: r.school, ...summaryOf(r) }));
  },

  async getSchoolBriefs(args: GetSchoolBriefsArgs): Promise<SchoolBrief[]> {
    return args.cds
      .map((cds) => byCds.get(cds))
      .filter((r): r is SchoolRecord => r !== undefined)
      .map((r) => ({ school: r.school, ...summaryOf(r) }));
  },
};
