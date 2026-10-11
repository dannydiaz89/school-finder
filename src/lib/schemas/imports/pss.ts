import { z } from "zod";
import { NullableCount, NullableNumber, OptionalText } from "./coerce";

/**
 * One row of the NCES Private School Universe Survey public-use CSV. The
 * physical-location columns (`PL_*`) are blank when they equal the mailing
 * address, so readers fall back to `PADDRS`/`PCITY`/`PSTABB`/`PZIP`.
 *
 * Source: https://nces.ed.gov/surveys/pss/zip/pss2324_pu_csv.zip
 * Layout: https://nces.ed.gov/surveys/pss/pdf/layout2023_24.pdf
 */
export const PssRow = z
  .object({
    PPIN: z.string().trim().min(1),
    PINST: z.string().trim().min(1),
    PADDRS: OptionalText,
    PCITY: OptionalText,
    PSTABB: OptionalText,
    PZIP: OptionalText,
    PPHONE: OptionalText,
    /** County name, upper case, e.g. "SACRAMENTO". */
    PCNTNM: OptionalText,
    PL_ADD: OptionalText,
    PL_CIT: OptionalText,
    PL_STABB: OptionalText,
    PL_ZIP: OptionalText,
    LATITUDE24: NullableNumber,
    LONGITUDE24: NullableNumber,
    /** Lowest and highest grade codes (unused; the affidavit grade columns give the span). */
    LOGR2024: OptionalText,
    HIGR2024: OptionalText,
    /** 1-3 Catholic, 4-6 other religious, 7-9 nonsectarian. */
    TYPOLOGY: OptionalText,
    RELIG: OptionalText,
    ORIENT: OptionalText,
    NUMSTUDS: NullableCount,
  })
  .loose();
export type PssRow = z.infer<typeof PssRow>;
