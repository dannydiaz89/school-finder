import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { getEnv } from "@/lib/schemas/env";
import {
  RadiusRows,
  SchoolDetail,
  SchoolSummary,
  SearchResult,
  type GetSchoolArgs,
  type GetSchoolsByCdsArgs,
  type NearbyArgs,
  type RadiusArgs,
} from "@/lib/schemas";
import type { SchoolDataSource } from "./index";

/**
 * Convex adapter. Each method is one call to a thin Convex query. The
 * queries validate arguments with the same Zod schemas and return the same
 * shapes; results are parsed against the result schemas on the way back so a
 * backend drift fails here, with a readable error, rather than in a page.
 *
 * One HTTP client is shared for the process and created with logging off:
 * Convex's default logger draws a random id, and Next's prerender check
 * flags `Math.random()` during server rendering.
 */

let client: ConvexHttpClient | undefined;

function getClient(): ConvexHttpClient {
  if (client) return client;
  const url = getEnv().NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  client = new ConvexHttpClient(url, { logger: false });
  return client;
}

export const convexDataSource: SchoolDataSource = {
  async searchSchools(args) {
    return SearchResult.parse(await getClient().query(api.schools.search, args));
  },
  async getSchool(args: GetSchoolArgs) {
    const result = await getClient().query(api.schools.get, args);
    return result === null ? null : SchoolDetail.parse(result);
  },
  async getNearby(args: NearbyArgs) {
    return z.array(SchoolSummary).parse(await getClient().query(api.schools.nearby, args));
  },
  async getSchoolsByCds(args: GetSchoolsByCdsArgs) {
    return z.array(SchoolDetail).parse(await getClient().query(api.schools.byCds, args));
  },
  async getSchoolsInRadius(args: RadiusArgs) {
    return RadiusRows.parse(await getClient().query(api.schools.inRadius, args));
  },
};
