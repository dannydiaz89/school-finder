import { z } from "zod";
import { CdsCode, Count } from "./common";

/** The indicators on the California School Dashboard. */
export const DashboardIndicatorId = z.enum([
  "ela",
  "math",
  "chronicAbsenteeism",
  "suspension",
  "graduation",
  "collegeCareer",
  "elpi",
  "science",
]);
export type DashboardIndicatorId = z.infer<typeof DashboardIndicatorId>;
export const DASHBOARD_INDICATORS = DashboardIndicatorId.options;

/** Performance levels, lowest to highest. The files encode these as color codes 1-5. */
export const DashboardLevel = z.enum(["red", "orange", "yellow", "green", "blue"]);
export type DashboardLevel = z.infer<typeof DashboardLevel>;
export const DASHBOARD_LEVELS = DashboardLevel.options;

/**
 * One indicator for one school in one Dashboard year, all students.
 * `status` is the measure itself: distance from standard in points for ELA
 * and Math, a percent for the rest. `change` is the difference from the
 * prior year in the same unit. `level` is null when the school did not meet
 * the minimum student count (30) for that indicator.
 */
export const DashboardIndicator = z
  .object({
    cds: CdsCode,
    /** Dashboard reporting year, e.g. 2025 for the 2024-25 school year. */
    year: z.number().int().min(2017).max(2100),
    indicator: DashboardIndicatorId,
    level: DashboardLevel.nullable(),
    status: z.number().nullable(),
    change: z.number().nullable(),
    statusLevel: z.number().int().min(1).max(5).nullable(),
    changeLevel: z.number().int().min(1).max(5).nullable(),
    denominator: Count.nullable(),
    nSizeMet: z.boolean(),
  })
  .strict();
export type DashboardIndicator = z.infer<typeof DashboardIndicator>;

/** Compact per-indicator value for list rows and compare tables. */
export const IndicatorSummary = z
  .object({
    level: DashboardLevel.nullable(),
    status: z.number().nullable(),
    change: z.number().nullable(),
  })
  .strict();
export type IndicatorSummary = z.infer<typeof IndicatorSummary>;

export const DashboardSummary = z
  .object({
    year: z.number().int().nullable(),
    ela: IndicatorSummary.optional(),
    math: IndicatorSummary.optional(),
    chronicAbsenteeism: IndicatorSummary.optional(),
    suspension: IndicatorSummary.optional(),
    graduation: IndicatorSummary.optional(),
    collegeCareer: IndicatorSummary.optional(),
    elpi: IndicatorSummary.optional(),
    science: IndicatorSummary.optional(),
  })
  .strict();
export type DashboardSummary = z.infer<typeof DashboardSummary>;
