import "server-only";
import {
  GetSchoolArgs,
  GetSchoolsByCdsArgs,
  NearbyArgs,
  SchoolDetail,
  SchoolSummary,
  SearchArgs,
  SearchResult,
} from "@/lib/schemas";
import { getEnv } from "@/lib/schemas/env";
import { z } from "zod";

/**
 * The data-access boundary. Pages and route handlers call these four
 * functions and nothing else. Arguments and results are validated against the
 * Zod contracts on the way in and out, so a backend bug surfaces here with a
 * readable error instead of as a broken page.
 *
 * Backends implement `SchoolDataSource`. The fixtures adapter is the default
 * and needs no network. Set DATA_SOURCE=convex to use the Convex adapter.
 */

export interface SchoolDataSource {
  searchSchools(args: SearchArgs): Promise<SearchResult>;
  getSchool(args: GetSchoolArgs): Promise<SchoolDetail | null>;
  getNearby(args: NearbyArgs): Promise<SchoolSummary[]>;
  getSchoolsByCds(args: GetSchoolsByCdsArgs): Promise<SchoolDetail[]>;
}

let source: SchoolDataSource | undefined;

async function resolveSource(): Promise<SchoolDataSource> {
  if (source) return source;
  const env = getEnv();
  if (env.DATA_SOURCE === "convex") {
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
