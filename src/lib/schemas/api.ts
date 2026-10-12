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

/** Every school within a radius, unfiltered: the raw material a page filters and sorts. */
export const RadiusArgs = z
  .object({
    center: Coordinates,
    radiusMiles: z.number().min(0.25).max(MAX_RADIUS_MILES),
  })
  .strict();
export type RadiusArgs = z.infer<typeof RadiusArgs>;

export const RadiusRows = z
  .object({
    rows: z.array(SchoolSummary),
    /** True when the area holds more schools than one read examines; `rows` are then the nearest. */
    truncated: z.boolean().default(false),
  })
  .strict();
export type RadiusRows = z.infer<typeof RadiusRows>;

/** Find schools by what they are called, anywhere in the state. */
export const NameSearchArgs = z
  .object({
    query: z.string().trim().min(2).max(80),
    limit: z.number().int().min(1).max(50),
  })
  .strict();
export type NameSearchArgs = z.infer<typeof NameSearchArgs>;

/**
 * A school with its search summary and no distance: what a row needs when
 * there is no place to measure from. One stored document per school.
 */
export const SchoolBrief = SchoolSummary.omit({ distanceMeters: true }).strict();
export type SchoolBrief = z.infer<typeof SchoolBrief>;

/** A name search has no center to measure from, so its rows are briefs. */
export const NameMatch = SchoolBrief;
export type NameMatch = SchoolBrief;

/** How many schools the My schools list holds. */
export const MAX_SAVED_SCHOOLS = 50;

export const GetSchoolBriefsArgs = z
  .object({
    cds: z.array(CdsCode).min(1).max(MAX_SAVED_SCHOOLS),
  })
  .strict();
export type GetSchoolBriefsArgs = z.infer<typeof GetSchoolBriefsArgs>;

/**
 * One entry of the My schools list. `addedAt` is kept so that a list moved to
 * an account later can be merged with one made on another device.
 */
export const SavedSchool = z.object({ cds: CdsCode, addedAt: z.iso.datetime() }).strict();
export type SavedSchool = z.infer<typeof SavedSchool>;

/** The My schools list as stored. Versioned so its shape can change without losing lists. */
export const SavedSchoolList = z
  .object({
    version: z.literal(1),
    schools: z.array(SavedSchool).max(MAX_SAVED_SCHOOLS),
  })
  .strict();
export type SavedSchoolList = z.infer<typeof SavedSchoolList>;

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

/**
 * Every year on file for the measures that have a history, oldest first.
 * `caaspp` holds all-grades results only.
 */
export const SchoolHistory = z
  .object({
    dashboard: z.array(DashboardIndicator),
    caaspp: z.array(CaasppResult),
  })
  .strict();
export type SchoolHistory = z.infer<typeof SchoolHistory>;

/**
 * One school as a page needs it. `dashboard` and `caaspp` hold the newest
 * year only, so nothing can mistake an old year for the current one; earlier
 * years are in `history`.
 */
export const SchoolDetail = SchoolRecord.extend({
  caasppComparison: CaasppComparison.nullable(),
  history: SchoolHistory.default({ dashboard: [], caaspp: [] }),
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
