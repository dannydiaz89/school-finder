import { z } from "zod";
import { CdsCode, Count, Percent100, SchoolYear } from "./common";

export const CaasppSubject = z.enum(["ela", "math"]);
export type CaasppSubject = z.infer<typeof CaasppSubject>;

/** Tested grades plus "all" (CDE grade code 13). */
export const CaasppGrade = z.enum(["all", "3", "4", "5", "6", "7", "8", "11"]);
export type CaasppGrade = z.infer<typeof CaasppGrade>;

/**
 * Smarter Balanced results for one school, subject, and grade, all students.
 * Percentages are null when CDE suppressed the group (fewer than 11 students).
 */
export const CaasppResult = z
  .object({
    cds: CdsCode,
    year: SchoolYear,
    subject: CaasppSubject,
    grade: CaasppGrade,
    studentsTested: Count.nullable(),
    meanScaleScore: z.number().nullable(),
    pctExceeded: Percent100.nullable(),
    pctMet: Percent100.nullable(),
    pctMetAndAbove: Percent100.nullable(),
    pctNearlyMet: Percent100.nullable(),
    pctNotMet: Percent100.nullable(),
  })
  .strict();
export type CaasppResult = z.infer<typeof CaasppResult>;

/** School vs. its district vs. California, percent met-and-above, all grades. */
export const CaasppComparison = z
  .object({
    year: SchoolYear,
    ela: z
      .object({
        school: Percent100.nullable(),
        district: Percent100.nullable(),
        state: Percent100.nullable(),
      })
      .strict(),
    math: z
      .object({
        school: Percent100.nullable(),
        district: Percent100.nullable(),
        state: Percent100.nullable(),
      })
      .strict(),
  })
  .strict();
export type CaasppComparison = z.infer<typeof CaasppComparison>;
