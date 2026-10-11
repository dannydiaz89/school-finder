import { z } from "zod";

/**
 * Building blocks shared by every other schema. Values here use the exact
 * codes the California Department of Education publishes, so imports can
 * validate rows without translation tables. Display labels live in
 * `src/lib/labels.ts`, never here.
 */

/** 14-digit County-District-School code, the primary key for every CA school. */
export const CdsCode = z
  .string()
  .regex(/^\d{14}$/, "CDS code must be 14 digits")
  .brand<"CdsCode">();
export type CdsCode = z.infer<typeof CdsCode>;

/** 12-digit federal NCES school id (7-digit district id + 5-digit school id). */
export const NcesSchoolId = z.string().regex(/^\d{12}$/, "NCES school id must be 12 digits");

/** School year as CDE writes it, e.g. "2024-25". */
export const SchoolYear = z.string().regex(/^\d{4}-\d{2}$/, 'School year looks like "2024-25"');
export type SchoolYear = z.infer<typeof SchoolYear>;

/** ISO calendar date, e.g. "2026-09-01". */
export const IsoDate = z.iso.date();

export const Coordinates = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();
export type Coordinates = z.infer<typeof Coordinates>;

/**
 * Grade codes. CDE grade spans use P (preschool), K, 1-12, and "Adult".
 * TK appears in enrollment files (GR_TK) but not in directory grade spans.
 */
export const GRADES = [
  "P",
  "TK",
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "A",
] as const;
export const Grade = z.enum(GRADES);
export type Grade = z.infer<typeof Grade>;

export const GradeSpan = z
  .object({ low: Grade, high: Grade })
  .strict()
  .refine(
    (s) => GRADES.indexOf(s.low) <= GRADES.indexOf(s.high),
    "low grade must not be above high grade",
  );
export type GradeSpan = z.infer<typeof GradeSpan>;

/** The three choices a parent sees. Charter schools are public; the label layer says so. */
export const SchoolType = z.enum(["district", "charter", "private"]);
export type SchoolType = z.infer<typeof SchoolType>;
export const SCHOOL_TYPES = SchoolType.options;

/** CDE EdOpsCode: how a public school operates. TRAD and ALTSOC are ordinary choices; the rest are placements. */
export const EducationalOption = z.enum([
  "TRAD",
  "ALTSOC",
  "CON",
  "COMM",
  "COMMDAY",
  "OPP",
  "JUV",
  "YTH",
  "SSS",
  "SPEC",
  "SPECON",
  "SPEDATP",
  "HOMHOS",
  "ROP",
]);
export type EducationalOption = z.infer<typeof EducationalOption>;

/** CDE EILCode: educational instruction level. */
export const InstructionLevel = z.enum(["PS", "ELEM", "INTMIDJR", "ELEMHIGH", "HS", "A", "UG"]);
export type InstructionLevel = z.infer<typeof InstructionLevel>;

/** CDE Virtual flag. F exclusively virtual, V primarily virtual, C primarily classroom, N not virtual, P partial (retired). */
export const VirtualStatus = z.enum(["F", "V", "C", "N", "P"]);
export type VirtualStatus = z.infer<typeof VirtualStatus>;

/** CDE charter FundingType, normalized. */
export const CharterFunding = z.enum(["directly", "locally", "notInModel"]);
export type CharterFunding = z.infer<typeof CharterFunding>;

/** Private school affiliation, from the NCES Private School Survey. */
export const Affiliation = z.enum(["catholic", "otherReligious", "nonsectarian"]);
export type Affiliation = z.infer<typeof Affiliation>;

/** CDE race/ethnicity reporting categories used in enrollment files. */
export const RaceEthnicity = z.enum(["RB", "RI", "RA", "RF", "RH", "RD", "RP", "RT", "RW"]);
export type RaceEthnicity = z.infer<typeof RaceEthnicity>;

/** A whole number count that can never be negative. */
export const Count = z.number().int().nonnegative();

/** Percent expressed 0-100 (how CAASPP and Dashboard files publish it). */
export const Percent100 = z.number().min(0).max(100);

/** Fraction expressed 0-1 (how the FRPM file publishes it). */
export const Fraction = z.number().min(0).max(1);
