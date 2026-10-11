import { z } from "zod";
import { CdsCode, Count, Fraction, Grade, RaceEthnicity, SchoolYear } from "./common";

/** One grade's headcount. An array rather than a record because Convex field names cannot start with a digit. */
export const GradeCount = z.object({ grade: Grade, count: Count }).strict();
export type GradeCount = z.infer<typeof GradeCount>;

/** Census Day enrollment, all students, with the breakdowns the UI shows. */
export const Enrollment = z
  .object({
    cds: CdsCode,
    year: SchoolYear,
    total: Count,
    byGrade: z.array(GradeCount),
    /**
     * Keyed by RaceEthnicity. Spelled as an object of optional keys rather than
     * `z.partialRecord` because convex-helpers derives required fields from a
     * partial record, which would reject every school missing a category.
     */
    byRaceEthnicity: z
      .object(Object.fromEntries(RaceEthnicity.options.map((code) => [code, Count.optional()])))
      .strict() as z.ZodObject<Record<RaceEthnicity, z.ZodOptional<typeof Count>>>,
    englishLearners: Count.optional(),
    studentsWithDisabilities: Count.optional(),
    socioeconomicallyDisadvantaged: Count.optional(),
  })
  .strict();
export type Enrollment = z.infer<typeof Enrollment>;

/** Free and reduced-price meal eligibility. Fractions, as the CDE file publishes them. */
export const Frpm = z
  .object({
    cds: CdsCode,
    year: SchoolYear,
    enrollment: Count,
    freeCount: Count,
    frpmCount: Count,
    pctFree: Fraction,
    pctFrpm: Fraction,
  })
  .strict();
export type Frpm = z.infer<typeof Frpm>;

/** Student-to-staff ratios from the CDE staff assignment files. */
export const StaffRatio = z
  .object({
    cds: CdsCode,
    year: SchoolYear,
    enrollment: Count,
    teacherFte: z.number().nonnegative(),
    /** Null when teacher FTE is under 1 and CDE suppresses the ratio. */
    studentTeacherRatio: z.number().nonnegative().nullable(),
  })
  .strict();
export type StaffRatio = z.infer<typeof StaffRatio>;

/** Private School Affidavit figures. Private schools have no CAASPP or Dashboard rows. */
export const PrivateSchoolDetail = z
  .object({
    cds: CdsCode,
    year: SchoolYear,
    enrollmentByGrade: z.array(GradeCount),
    totalEnrollment: Count,
    fullTimeTeachers: Count,
    partTimeTeachers: Count,
    administrators: Count,
    otherStaff: Count,
    previousYearGraduates: Count.nullable(),
  })
  .strict();
export type PrivateSchoolDetail = z.infer<typeof PrivateSchoolDetail>;
