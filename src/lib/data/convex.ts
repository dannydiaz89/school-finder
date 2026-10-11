import { fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { getEnv } from "@/lib/schemas/env";
import {
  SchoolDetail,
  SchoolSummary,
  SearchResult,
  type GetSchoolArgs,
  type GetSchoolsByCdsArgs,
  type NearbyArgs,
} from "@/lib/schemas";
import type { SchoolDataSource } from "./index";

/**
 * Convex adapter. Each method is one call to a thin Convex query. The
 * queries validate arguments with the same Zod schemas and return the same
 * shapes; results are parsed against the result schemas on the way back so a
 * backend drift fails here, with a readable error, rather than in a page.
 */

function options() {
  const url = getEnv().NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return { url };
}

export const convexDataSource: SchoolDataSource = {
  async searchSchools(args) {
    return SearchResult.parse(await fetchQuery(api.schools.search, args, options()));
  },
  async getSchool(args: GetSchoolArgs) {
    const result = await fetchQuery(api.schools.get, args, options());
    return result === null ? null : SchoolDetail.parse(result);
  },
  async getNearby(args: NearbyArgs) {
    return z.array(SchoolSummary).parse(await fetchQuery(api.schools.nearby, args, options()));
  },
  async getSchoolsByCds(args: GetSchoolsByCdsArgs) {
    return z.array(SchoolDetail).parse(await fetchQuery(api.schools.byCds, args, options()));
  },
};
