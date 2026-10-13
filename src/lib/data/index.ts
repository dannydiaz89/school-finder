import "server-only";
import {
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
  SchoolSummary,
  SearchArgs,
  SearchResult,
} from "@/lib/schemas";
import { convexUrl } from "@/lib/schemas/env";
import { z } from "zod";

/**
 * The data-access boundary. Pages and route handlers call these
 * functions and nothing else. Arguments and results are validated against the
 * Zod contracts on the way in and out, so a backend bug surfaces here with a
 * readable error instead of as a broken page.
 *
 * Backends implement `SchoolDataSource`. The fixtures adapter is the default
 * and needs no network. Giving a Convex address (see `src/lib/schemas/env.ts`)
 * switches to the Convex adapter.
 */

export interface SchoolDataSource {
  searchSchools(args: SearchArgs): Promise<SearchResult>;
  getSchool(args: GetSchoolArgs): Promise<SchoolDetail | null>;
  getNearby(args: NearbyArgs): Promise<SchoolSummary[]>;
  getSchoolsByCds(args: GetSchoolsByCdsArgs): Promise<SchoolDetail[]>;
  getSchoolsInRadius(args: RadiusArgs): Promise<RadiusRows>;
  findSchoolsByName(args: NameSearchArgs): Promise<NameMatch[]>;
  getSchoolBriefs(args: GetSchoolBriefsArgs): Promise<SchoolBrief[]>;
}

let source: SchoolDataSource | undefined;

async function resolveSource(): Promise<SchoolDataSource> {
  if (source) return source;
  // A Convex address is the switch: with one, read Convex; without, the bundled sample data.
  if (convexUrl()) {
    const { convexDataSource } = await import("./convex");
    source = convexDataSource;
  } else {
    const { fixturesDataSource } = await import("./fixtures");
    source = fixturesDataSource;
  }
  return source;
}

/** Test helper. */
export function setDataSourceForTests(next: SchoolDataSource | undefined) {
  source = next;
}

export async function searchSchools(input: z.input<typeof SearchArgs>): Promise<SearchResult> {
  const args = SearchArgs.parse(input);
  const result = await (await resolveSource()).searchSchools(args);
  return SearchResult.parse(result);
}

export async function getSchool(
  input: z.input<typeof GetSchoolArgs>,
): Promise<SchoolDetail | null> {
  const args = GetSchoolArgs.parse(input);
  const result = await (await resolveSource()).getSchool(args);
  return result === null ? null : SchoolDetail.parse(result);
}

export async function getNearby(input: z.input<typeof NearbyArgs>): Promise<SchoolSummary[]> {
  const args = NearbyArgs.parse(input);
  const result = await (await resolveSource()).getNearby(args);
  return z.array(SchoolSummary).parse(result);
}

export async function getSchoolsByCds(
  input: z.input<typeof GetSchoolsByCdsArgs>,
): Promise<SchoolDetail[]> {
  const args = GetSchoolsByCdsArgs.parse(input);
  const result = await (await resolveSource()).getSchoolsByCds(args);
  return z.array(SchoolDetail).parse(result);
}

/**
 * Every school within a radius, unfiltered. Pages cache this once per address
 * and apply filters, sorting, and paging to it with `assembleSearchResult`,
 * so changing a filter never reaches the backend.
 */
export async function getSchoolsInRadius(input: z.input<typeof RadiusArgs>): Promise<RadiusRows> {
  const args = RadiusArgs.parse(input);
  const result = await (await resolveSource()).getSchoolsInRadius(args);
  return RadiusRows.parse(result);
}

/** Schools whose name matches every word typed, best match first. Statewide, no location needed. */
export async function findSchoolsByName(
  input: z.input<typeof NameSearchArgs>,
): Promise<NameMatch[]> {
  const args = NameSearchArgs.parse(input);
  const result = await (await resolveSource()).findSchoolsByName(args);
  return z.array(NameMatch).parse(result);
}

/**
 * Summary rows for a list of schools, in the order asked, unknown codes
 * dropped. One stored document per school, so a long saved list stays cheap.
 */
export async function getSchoolBriefs(
  input: z.input<typeof GetSchoolBriefsArgs>,
): Promise<SchoolBrief[]> {
  const args = GetSchoolBriefsArgs.parse(input);
  const result = await (await resolveSource()).getSchoolBriefs(args);
  return z.array(SchoolBrief).parse(result);
}
