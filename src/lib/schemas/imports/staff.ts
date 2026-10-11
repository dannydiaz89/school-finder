import { z } from "zod";
import { NullableCount, NullableNumber, SchoolYearText, paddedCode } from "./coerce";

/**
 * One row of the CDE student/staff ratio file (tab-delimited). FTE columns
 * carry thousands separators. The ratio is blank when teacher FTE is under 1.
 *
 * Source: https://www3.cde.ca.gov/demo-downloads/staff/strat2324.txt
 */
export const StaffRow = z
  .object({
    "Academic Year": SchoolYearText,
    /** T state, C county, D district, S school. */
    "Aggregate Level": z.enum(["T", "C", "D", "S"]),
    "County Code": paddedCode(2),
    "District Code": z.string().trim(),
    "School Code": z.string().trim(),
    TOTAL_ENR_N: NullableCount,
    TCH_FTE_N: NullableNumber,
    STU_TCH_RATIO: NullableNumber,
  })
  .loose();
export type StaffRow = z.infer<typeof StaffRow>;
