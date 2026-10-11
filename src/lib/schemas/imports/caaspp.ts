import { z } from "zod";
import { NullableCount, NullableNumber, paddedCode } from "./coerce";

/**
 * One row of the CAASPP Smarter Balanced research file. The "csv" zip holds a
 * caret-delimited .txt. Codes that the layout document shows zero-padded are
 * stored unpadded ("7", "1", "13"), so they are padded here.
 *
 * Source: https://caaspp-elpac.ets.org/caaspp/ResearchFileListSB
 */
export const CaasppRow = z
  .object({
    "County Code": paddedCode(2),
    "District Code": paddedCode(5),
    "School Code": paddedCode(7),
    /** 04 state, 05 county, 06 district, 07 school, 09 direct-funded charter, 10 locally-funded charter. */
    "Type ID": paddedCode(2),
    "Test Year": z.coerce.number().int(),
    /** 1 ELA, 2 Math (3 and 4 are CAST/CAA). */
    "Test ID": z.string().trim(),
    /** 1 is all students. */
    "Student Group ID": paddedCode(3),
    /** 3-8, 11, or 13 for all grades. */
    Grade: paddedCode(2),
    "Total Students Tested": NullableCount,
    "Mean Scale Score": NullableNumber,
    "Percentage Standard Exceeded": NullableNumber,
    "Percentage Standard Met": NullableNumber,
    "Percentage Standard Met and Above": NullableNumber,
    "Percentage Standard Nearly Met": NullableNumber,
    "Percentage Standard Not Met": NullableNumber,
  })
  .loose();
export type CaasppRow = z.infer<typeof CaasppRow>;
