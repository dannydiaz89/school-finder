import { StaffRatio } from "@/lib/schemas";
import type { StaffRow } from "@/lib/schemas/imports/staff";
import { cdsFromParts } from "./common";

/**
 * Student/staff ratio row -> StaffRatio. Pure.
 */

export function staffCds(row: StaffRow): string {
  return cdsFromParts(row["County Code"], row["District Code"], row["School Code"]);
}

/** Null for non-school rows and rows without an enrollment or teacher FTE. */
export function staffRatioFromRow(row: StaffRow): StaffRatio | null {
  if (row["Aggregate Level"] !== "S") return null;
  const enrollment = row.TOTAL_ENR_N;
  const fte = row.TCH_FTE_N;
  if (enrollment === null || fte === null) return null;
  return StaffRatio.parse({
    cds: staffCds(row),
    year: row["Academic Year"],
    enrollment,
    teacherFte: fte,
    studentTeacherRatio: row.STU_TCH_RATIO,
  });
}
