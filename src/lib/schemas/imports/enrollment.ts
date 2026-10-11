import { z } from "zod";
import { NullableCount, SchoolYearText, paddedCode } from "./coerce";

/**
 * One row of the CDE Census Day enrollment file (tab-delimited). One row per
 * entity per reporting category; `TA` is the all-students total and the
 * `RE_*` / `SG_*` categories carry the breakdowns. `*` means suppressed.
 *
 * Source: https://www3.cde.ca.gov/demo-downloads/census/cdenroll2425.txt
 * Layout: https://www.cde.ca.gov/ds/ad/fsenrcensus.asp
 */
export const EnrollmentRow = z
  .object({
    AcademicYear: SchoolYearText,
    /** T state, C county, D district, S school. */
    AggregateLevel: z.enum(["T", "C", "D", "S"]),
    CountyCode: paddedCode(2),
    DistrictCode: z.string().trim(),
    SchoolCode: z.string().trim(),
    ReportingCategory: z.string().trim().min(1),
    TOTAL_ENR: NullableCount,
    GR_TK: NullableCount,
    GR_KN: NullableCount,
    GR_01: NullableCount,
    GR_02: NullableCount,
    GR_03: NullableCount,
    GR_04: NullableCount,
    GR_05: NullableCount,
    GR_06: NullableCount,
    GR_07: NullableCount,
    GR_08: NullableCount,
    GR_09: NullableCount,
    GR_10: NullableCount,
    GR_11: NullableCount,
    GR_12: NullableCount,
  })
  .loose();
export type EnrollmentRow = z.infer<typeof EnrollmentRow>;
