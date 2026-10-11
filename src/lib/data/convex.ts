import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getEnv } from "@/lib/schemas/env";
import type {
  GetSchoolArgs,
  GetSchoolsByCdsArgs,
  NearbyArgs,
  SchoolDetail,
  SchoolSummary,
  SearchArgs,
  SearchResult,
} from "@/lib/schemas";
import type { SchoolDataSource } from "./index";

/**
 * Convex adapter. Each method is one call to a thin Convex query. The
 * queries validate arguments with the same Zod schemas and return the same
 * shapes, so this file stays a straight pass-through.
 */

function options() {
  const url = getEnv().NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return { url };
}

export const convexDataSource: SchoolDataSource = {
  async searchSchools(args: SearchArgs): Promise<SearchResult> {
    return (await fetchQuery(api.schools.search, args, options())) as SearchResult;
  },
  async getSchool(args: GetSchoolArgs): Promise<SchoolDetail | null> {
    return (await fetchQuery(api.schools.get, args, options())) as SchoolDetail | null;
  },
  async getNearby(args: NearbyArgs): Promise<SchoolSummary[]> {
    return (await fetchQuery(api.schools.nearby, args, options())) as SchoolSummary[];
  },
  async getSchoolsByCds(args: GetSchoolsByCdsArgs): Promise<SchoolDetail[]> {
    return (await fetchQuery(api.schools.byCds, args, options())) as SchoolDetail[];
  },
};
