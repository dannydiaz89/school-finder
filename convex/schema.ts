import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { zodToConvex, zodToConvexFields } from "convex-helpers/server/zod4";
import {
  CaasppResult,
  DashboardIndicator,
  Enrollment,
  Frpm,
  PrivateSchoolDetail,
  School,
  SearchSummary,
  StaffRatio,
} from "../src/lib/schemas";

/**
 * Convex tables, derived from the Zod domain schemas. Do not add fields here
 * by hand: add them to the schema in src/lib/schemas and they appear here.
 * Indexes are the only thing this file decides.
 */

export default defineSchema({
  schools: defineTable({
    ...zodToConvexFields(School.shape),
    /** Precomputed search row (see SearchSummary). Rebuilt at the end of every import. */
    summary: v.optional(zodToConvex(SearchSummary)),
    /** Grid cell for radius search (see src/lib/domain/grid.ts). Absent when a school has no coordinates. */
    geoRow: v.optional(v.float64()),
    geoCol: v.optional(v.float64()),
    /** Normalized name, city, and district for name search (see src/lib/domain/names.ts). */
    searchText: v.optional(v.string()),
  })
    .index("by_geo", ["geoRow", "geoCol"])
    .searchIndex("search_text", { searchField: "searchText" })
    .index("by_cds", ["cds"])
    .index("by_type", ["type"])
    .index("by_districtCds", ["districtCds"]),

  dashboard: defineTable(zodToConvexFields(DashboardIndicator.shape))
    .index("by_cds", ["cds"])
    .index("by_cds_year", ["cds", "year"]),

  caaspp: defineTable(zodToConvexFields(CaasppResult.shape))
    .index("by_cds", ["cds"])
    .index("by_cds_year", ["cds", "year"]),

  enrollment: defineTable(zodToConvexFields(Enrollment.shape)).index("by_cds", ["cds"]),

  frpm: defineTable(zodToConvexFields(Frpm.shape)).index("by_cds", ["cds"]),

  staffRatios: defineTable(zodToConvexFields(StaffRatio.shape)).index("by_cds", ["cds"]),

  privateDetails: defineTable(zodToConvexFields(PrivateSchoolDetail.shape)).index("by_cds", [
    "cds",
  ]),

  /** Hand-curated fixes for private schools matched to the wrong NCES record. */
  privateSchoolOverrides: defineTable({
    cds: v.string(),
    pssId: v.union(v.string(), v.null()),
    note: v.string(),
  }).index("by_cds", ["cds"]),

  geocodeCache: defineTable({
    /** Normalized address string, the lookup key. */
    key: v.string(),
    query: v.string(),
    matchedAddress: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    createdAt: v.float64(),
  }).index("by_key", ["key"]),

  importRuns: defineTable({
    source: v.string(),
    url: v.string(),
    year: v.string(),
    rowsRead: v.float64(),
    rowsWritten: v.float64(),
    rowsRejected: v.float64(),
    startedAt: v.float64(),
    finishedAt: v.union(v.float64(), v.null()),
    error: v.union(v.string(), v.null()),
  }).index("by_source", ["source"]),
});
