import { Frpm } from "@/lib/schemas";
import type { FrpmRow } from "@/lib/schemas/imports/frpm";
import { cdsFromParts } from "./common";

/**
 * FRPM workbook row -> Frpm. Pure. Percents are recomputed from the counts so
 * a spreadsheet formula cell that did not evaluate cannot leak through, and
 * clamped to 1 because CDE's counts occasionally exceed enrollment.
 */

export function frpmCds(row: FrpmRow): string {
  return cdsFromParts(row["County Code"], row["District Code"], row["School Code"]);
}

/** Null when enrollment is zero or any count is missing. */
export function frpmFromRow(row: FrpmRow): Frpm | null {
  const enrollment = row["Enrollment (K-12)"];
  const free = row["Free Meal Count (K-12)"];
  const frpm = row["FRPM Count (K-12)"];
  if (enrollment === null || free === null || frpm === null || enrollment === 0) return null;
  return Frpm.parse({
    cds: frpmCds(row),
    year: row["Academic Year"],
    enrollment,
    freeCount: free,
    frpmCount: frpm,
    pctFree: Math.min(1, free / enrollment),
    pctFrpm: Math.min(1, frpm / enrollment),
  });
}
