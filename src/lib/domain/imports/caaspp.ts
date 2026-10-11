import { CaasppResult, type CaasppGrade, type CaasppSubject } from "@/lib/schemas";
import type { CaasppRow } from "@/lib/schemas/imports/caaspp";
import { cdsFromParts, schoolYearFromTestYear } from "./common";

/**
 * CAASPP research file row -> CaasppResult. Pure. The file holds every
 * entity level; the importer keeps state, district, and school rows so the
 * detail page can compare a school with its district and California.
 */

export type CaasppEntity = "state" | "county" | "district" | "school" | "other";

/** 04 state, 05 county, 06 district, 07 school, 09 direct-funded charter, 10 locally-funded charter. */
export function caasppEntity(row: CaasppRow): CaasppEntity {
  switch (row["Type ID"]) {
    case "04":
      return "state";
    case "05":
      return "county";
    case "06":
      return "district";
    case "07":
    case "09":
    case "10":
      return "school";
    default:
      return "other";
  }
}

export const CAASPP_SUBJECTS: Record<string, CaasppSubject> = { "1": "ela", "2": "math" };

export const CAASPP_GRADES: Record<string, CaasppGrade> = {
  "13": "all",
  "03": "3",
  "04": "4",
  "05": "5",
  "06": "6",
  "07": "7",
  "08": "8",
  "11": "11",
};

export function caasppCds(row: CaasppRow): string {
  return cdsFromParts(row["County Code"], row["District Code"], row["School Code"]);
}

/** All-students ELA/Math rows for a tested grade. Null for other groups, tests, or grades. */
export function caasppResultFromRow(row: CaasppRow): CaasppResult | null {
  if (row["Student Group ID"] !== "001") return null;
  const subject = CAASPP_SUBJECTS[row["Test ID"]];
  const grade = CAASPP_GRADES[row.Grade];
  if (!subject || !grade) return null;
  return CaasppResult.parse({
    cds: caasppCds(row),
    year: schoolYearFromTestYear(row["Test Year"]),
    subject,
    grade,
    studentsTested: row["Total Students Tested"],
    meanScaleScore: row["Mean Scale Score"],
    pctExceeded: row["Percentage Standard Exceeded"],
    pctMet: row["Percentage Standard Met"],
    pctMetAndAbove: row["Percentage Standard Met and Above"],
    pctNearlyMet: row["Percentage Standard Nearly Met"],
    pctNotMet: row["Percentage Standard Not Met"],
  });
}
