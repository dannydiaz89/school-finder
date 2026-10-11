import { z } from "zod";
import { CaasppComparison, CaasppResult } from "./caaspp";
import { Affiliation, CdsCode, Coordinates, Count, SchoolType } from "./common";
import { DashboardIndicator, DashboardLevel, DashboardSummary } from "./dashboard";
import { Enrollment, Frpm, PrivateSchoolDetail, StaffRatio } from "./enrollment";
import { School } from "./school";

/**
 * The data-access contract. Every function in `src/lib/data/` takes one of
 * these Args and returns one of these Results, whatever the backend. No
 * defaults here: defaults are applied when URL state is parsed, so Convex
 * validators derived from these schemas stay simple.
 */

export const GradeBand = z.enum(["tk", "elementary", "middle", "high"]);
export type GradeBand = z.infer<typeof GradeBand>;

export const Program = z.enum(["magnet", "multilingual", "virtual"]);
export type Program = z.infer<typeof Program>;

export const SortKey = z.enum(["distance", "ela", "math", "enrollment"]);
export type SortKey = z.infer<typeof SortKey>;

export const SearchFilters = z
  .object({
    /** Which of the three types to include. Empty means none, so the UI never sends empty. */
    types: z.array(SchoolType).min(1),
    /** Any-of. Empty means no grade restriction. */
    gradeBands: z.array(GradeBand),
    /** Any-of. Empty means no program restriction. */
    programs: z.array(Program),
    /** Any-of, private schools only. Empty means no restriction. */
    affiliations: z.array(Affiliation),
    /** Keep schools whose ELA level is at or above this. Schools with no level are dropped. */
    minElaLevel: DashboardLevel.nullable(),
    maxEnrollment: Count.nullable(),
    /** Show continuation, community day, juvenile court, special education, and similar placements. */
    includeSpecialized: z.boolean(),
  })
  .strict();
export type SearchFilters = z.infer<typeof SearchFilters>;

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  types: ["district", "charter", "private"],
  gradeBands: [],
  programs: [],
  affiliations: [],
  minElaLevel: null,
  maxEnrollment: null,
  includeSpecialized: false,
};

export const MAX_RADIUS_MILES = 25;
export const DEFAULT_RADIUS_MILES = 3;
export const DEFAULT_PAGE_SIZE = 25;

export const SearchArgs = z
  .object({
    center: Coordinates,
    radiusMiles: z.number().min(0.25).max(MAX_RADIUS_MILES),
    filters: SearchFilters,
    sort: SortKey,
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();
export type SearchArgs = z.infer<typeof SearchArgs>;

/** One row in search results and nearby lists. */
export const SchoolSummary = z
  .object({
    school: School,
    distanceMeters: z.number().nonnegative(),
    dashboard: DashboardSummary,
    enrollment: Count.nullable(),
    studentTeacherRatio: z.number().nullable(),
  })
  .strict();
export type SchoolSummary = z.infer<typeof SchoolSummary>;

/**
 * The part of a search row that does not depend on where the search is
 * centered. Stored on each school document at import time so a search costs
 * one read per candidate instead of a dozen.
 */
export const SearchSummary = SchoolSummary.pick({
  dashboard: true,
  enrollment: true,
  studentTeacherRatio: true,
}).strict();
export type SearchSummary = z.infer<typeof SearchSummary>;

export const SearchResult = z
  .object({
    schools: z.array(SchoolSummary),
    /** Matches after filters, before paging. */
    total: Count,
    /** Matches within the radius by type, before the type filter, so the UI can say what is hidden. */
    countsByType: z.object({ district: Count, charter: Count, private: Count }).strict(),
    /** Schools within the radius that were hidden because includeSpecialized is false. */
    hiddenSpecialized: Count,
    /**
     * True when the area holds more schools than one search examines. The rows
     * and counts then cover only the nearest schools, and the UI says so.
     *
     * Defaults to false so a backend deployed before this field existed still
     * parses. New result fields should always be added this way: the web app
     * and the backend deploy separately and may briefly be out of step.
     */
    truncated: z.boolean().default(false),
  })
  .strict();
export type SearchResult = z.infer<typeof SearchResult>;

export const GetSchoolArgs = z.object({ cds: CdsCode }).strict();
export type GetSchoolArgs = z.infer<typeof GetSchoolArgs>;

/** Everything stored about one school. The fixture file is a list of these. */
export const SchoolRecord = z
  .object({
    school: School,
    dashboard: z.array(DashboardIndicator),
    caaspp: z.array(CaasppResult),
    enrollment: Enrollment.nullable(),
    frpm: Frpm.nullable(),
    staff: StaffRatio.nullable(),
    privateDetail: PrivateSchoolDetail.nullable(),
  })
  .strict();
export type SchoolRecord = z.infer<typeof SchoolRecord>;

export const SchoolDetail = SchoolRecord.extend({
  caasppComparison: CaasppComparison.nullable(),
}).strict();
export type SchoolDetail = z.infer<typeof SchoolDetail>;

export const NearbyArgs = z
  .object({
    cds: CdsCode,
    limit: z.number().int().min(1).max(20),
  })
  .strict();
export type NearbyArgs = z.infer<typeof NearbyArgs>;

export const MAX_COMPARE = 5;

export const GetSchoolsByCdsArgs = z
  .object({
    cds: z.array(CdsCode).min(1).max(MAX_COMPARE),
  })
  .strict();
export type GetSchoolsByCdsArgs = z.infer<typeof GetSchoolsByCdsArgs>;
