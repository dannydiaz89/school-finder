import { z } from "zod";
import { NullableCount, OptionalText, PaddedCds } from "./coerce";

/**
 * One row of the CDE Private School Affidavit workbook (one sheet, header on
 * row 6). The CDS code is stored numeric so its leading zero is restored.
 * There is no address, phone, or coordinates in this file; those come from
 * the NCES Private School Survey.
 *
 * Source: https://www.cde.ca.gov/ds/si/ps/documents/privateschooldata2425.xlsx
 */
export const AffidavitRow = z
  .object({
    "CDS Code": PaddedCds,
    County: z.string().trim().min(1),
    "Public School District": OptionalText,
    "School Name": z.string().trim().min(1),
    "Grade K Enroll": NullableCount,
    "Grade 1 Enroll": NullableCount,
    "Grade 2 Enroll": NullableCount,
    "Grade 3 Enroll": NullableCount,
    "Grade 4 Enroll": NullableCount,
    "Grade 5 Enroll": NullableCount,
    "Grade 6 Enroll": NullableCount,
    "Grade 7 Enroll": NullableCount,
    "Grade 8 Enroll": NullableCount,
    "Grade 9 Enroll": NullableCount,
    "Grade 10 Enroll": NullableCount,
    "Grade 11 Enroll": NullableCount,
    "Grade 12 Enroll": NullableCount,
    "Total Enrollment": NullableCount,
    "Previous Year Grads": NullableCount,
    "Full Time Teachers": NullableCount,
    "Part Time Teachers": NullableCount,
    Administrators: NullableCount,
    "Other Staff": NullableCount,
  })
  .loose();
export type AffidavitRow = z.infer<typeof AffidavitRow>;
