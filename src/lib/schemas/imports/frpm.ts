import { z } from "zod";
import { NullableCount, NullableNumber, OptionalText, SchoolYearText, paddedCode } from "./coerce";

/**
 * One row of the "FRPM School-Level Data" sheet of the CDE FRPM workbook.
 * Header cells contain line breaks; the sheet reader collapses whitespace so
 * the names below match. Percent columns are stored as fractions.
 *
 * Source: https://www.cde.ca.gov/ds/ad/documents/frpm2425.xlsx
 */
export const FrpmRow = z
  .object({
    "Academic Year": SchoolYearText,
    "County Code": paddedCode(2),
    "District Code": paddedCode(5),
    "School Code": paddedCode(7),
    "School Name": OptionalText,
    "Educational Option Type": OptionalText,
    "Charter School (Y/N)": OptionalText,
    "Low Grade": OptionalText,
    "High Grade": OptionalText,
    "Enrollment (K-12)": NullableCount,
    "Free Meal Count (K-12)": NullableCount,
    "Percent (%) Eligible Free (K-12)": NullableNumber,
    "FRPM Count (K-12)": NullableCount,
    "Percent (%) Eligible FRPM (K-12)": NullableNumber,
  })
  .loose();
export type FrpmRow = z.infer<typeof FrpmRow>;
