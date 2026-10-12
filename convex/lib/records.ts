import type {
  CdsCode,
  CaasppResult,
  DashboardIndicator,
  Enrollment,
  Frpm,
  PrivateSchoolDetail,
  School,
  SchoolRecord,
  StaffRatio,
} from "../../src/lib/schemas";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Load the per-school tables into the SchoolRecord shape the domain
 * functions take. Documents were validated by the Zod schemas when they were
 * imported, so stripping the system fields gives back the domain object.
 */

export function stripSystem<T extends { _id: unknown; _creationTime: unknown }>(
  doc: T,
): Omit<T, "_id" | "_creationTime"> {
  const copy: Record<string, unknown> = { ...doc };
  delete copy._id;
  delete copy._creationTime;
  return copy as Omit<T, "_id" | "_creationTime">;
}

const byCds = (ctx: QueryCtx, cds: CdsCode) => ({
  dashboard: () =>
    ctx.db
      .query("dashboard")
      .withIndex("by_cds", (q) => q.eq("cds", cds))
      .collect(),
  caaspp: () =>
    ctx.db
      .query("caaspp")
      .withIndex("by_cds", (q) => q.eq("cds", cds))
      .collect(),
  enrollment: () =>
    ctx.db
      .query("enrollment")
      .withIndex("by_cds", (q) => q.eq("cds", cds))
      .first(),
  frpm: () =>
    ctx.db
      .query("frpm")
      .withIndex("by_cds", (q) => q.eq("cds", cds))
      .first(),
  staff: () =>
    ctx.db
      .query("staffRatios")
      .withIndex("by_cds", (q) => q.eq("cds", cds))
      .first(),
  privateDetail: () =>
    ctx.db
      .query("privateDetails")
      .withIndex("by_cds", (q) => q.eq("cds", cds))
      .first(),
});

/** A stored school document as the domain `School`: no system fields, search summary, or grid cell. */
export function toSchool(doc: Doc<"schools">): School {
  const copy: Record<string, unknown> = { ...doc };
  delete copy._id;
  delete copy._creationTime;
  delete copy.summary;
  delete copy.geoRow;
  delete copy.geoCol;
  delete copy.searchText;
  delete copy.directoryGradesServed;
  return copy as School;
}

export async function loadCaasppByCds(ctx: QueryCtx, cds: CdsCode): Promise<CaasppResult[]> {
  const rows = await byCds(ctx, cds).caaspp();
  return rows.map((r) => stripSystem(r) as CaasppResult);
}

/** The whole record: every table for one school. */
export async function loadRecord(ctx: QueryCtx, school: Doc<"schools">): Promise<SchoolRecord> {
  const q = byCds(ctx, school.cds);
  const [dashboard, caaspp, enrollment, frpm, staff, privateDetail] = await Promise.all([
    q.dashboard(),
    q.caaspp(),
    q.enrollment(),
    q.frpm(),
    q.staff(),
    school.type === "private" ? q.privateDetail() : Promise.resolve(null),
  ]);
  return {
    school: toSchool(school),
    dashboard: dashboard.map((d) => stripSystem(d) as DashboardIndicator),
    caaspp: caaspp.map((c) => stripSystem(c) as CaasppResult),
    enrollment: enrollment ? (stripSystem(enrollment) as Enrollment) : null,
    frpm: frpm ? (stripSystem(frpm) as Frpm) : null,
    staff: staff ? (stripSystem(staff) as StaffRatio) : null,
    privateDetail: privateDetail ? (stripSystem(privateDetail) as PrivateSchoolDetail) : null,
  };
}

/** Only what a list row needs: dashboard levels, enrollment, staff ratio. */
/**
 * The newest Dashboard year for a school, read through the (cds, year) index:
 * one read to find the year, then only that year's rows. A search summary
 * never needs the earlier years.
 */
async function loadCurrentDashboard(ctx: QueryCtx, cds: CdsCode): Promise<Doc<"dashboard">[]> {
  const newest = await ctx.db
    .query("dashboard")
    .withIndex("by_cds_year", (q) => q.eq("cds", cds))
    .order("desc")
    .first();
  if (!newest) return [];
  return ctx.db
    .query("dashboard")
    .withIndex("by_cds_year", (q) => q.eq("cds", cds).eq("year", newest.year))
    .collect();
}

export async function loadSummaryRecord(
  ctx: QueryCtx,
  school: Doc<"schools">,
): Promise<SchoolRecord> {
  const q = byCds(ctx, school.cds);
  const [dashboard, enrollment, staff, privateDetail] = await Promise.all([
    school.type === "private" ? Promise.resolve([]) : loadCurrentDashboard(ctx, school.cds),
    school.type === "private" ? Promise.resolve(null) : q.enrollment(),
    school.type === "private" ? Promise.resolve(null) : q.staff(),
    school.type === "private" ? q.privateDetail() : Promise.resolve(null),
  ]);
  return {
    school: toSchool(school),
    dashboard: dashboard.map((d) => stripSystem(d) as DashboardIndicator),
    caaspp: [],
    enrollment: enrollment ? (stripSystem(enrollment) as Enrollment) : null,
    frpm: null,
    staff: staff ? (stripSystem(staff) as StaffRatio) : null,
    privateDetail: privateDetail ? (stripSystem(privateDetail) as PrivateSchoolDetail) : null,
  };
}

export async function schoolByCds(ctx: QueryCtx, cds: CdsCode): Promise<Doc<"schools"> | null> {
  return ctx.db
    .query("schools")
    .withIndex("by_cds", (q) => q.eq("cds", cds))
    .first();
}
