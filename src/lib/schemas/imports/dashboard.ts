import { z } from "zod";
import { NullableCount, NullableNumber } from "./coerce";

/**
 * One row of a California School Dashboard research file (tab-delimited).
 * The eight indicator files share the columns below; each adds its own extra
 * columns, which `.loose()` lets through. The chronic absenteeism file spells
 * `changeLevel` with a capital L, so keys are lowercased before validation.
 *
 * Source: https://www3.cde.ca.gov/researchfiles/cadashboard/
 */

/** Indicator codes as the files spell them in the `indicator` column. */
export const DashboardFileIndicator = z.enum([
  "ELA",
  "MATH",
  "CHRO",
  "SUSP",
  "GRAD",
  "CCI",
  "ELPI",
  "SCIENCE",
]);
export type DashboardFileIndicator = z.infer<typeof DashboardFileIndicator>;

const lowercaseKeys = (row: unknown) =>
  row && typeof row === "object"
    ? Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
    : row;

export const DashboardRow = z.preprocess(
  lowercaseKeys,
  z
    .object({
      cds: z.string().regex(/^\d{14}$/),
      /** X state, C county, D district, S school. */
      rtype: z.enum(["X", "C", "D", "S"]),
      studentgroup: z.string().trim().min(1),
      currdenom: NullableCount,
      currstatus: NullableNumber,
      change: NullableNumber,
      statuslevel: NullableCount,
      changelevel: NullableCount,
      /** 0 or blank means no performance level. */
      color: NullableCount,
      currnsizemet: z.string().trim().optional(),
      indicator: DashboardFileIndicator,
      reportingyear: z.coerce.number().int().min(2017).max(2100),
    })
    .loose(),
);
export type DashboardRow = z.infer<typeof DashboardRow>;
