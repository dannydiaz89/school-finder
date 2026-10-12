import { z } from "zod";
import { CaasppResult, IsoDate, SchoolRecord } from "@/lib/schemas";
import { servedSpan } from "@/lib/domain/grades";
import raw from "./schools.json";

/**
 * Hand-checked sample of real Sacramento-area schools, built from the same
 * public files the importers use. UI workstreams develop against this; it is
 * also the reference data for adapter contract tests.
 */
export const FixtureFile = z
  .object({
    generatedAt: IsoDate,
    sources: z.array(z.object({ name: z.string(), url: z.url(), retrievedAt: IsoDate }).strict()),
    /** All-grades CAASPP rows for California (cds 00000000000000). */
    stateCaaspp: z.array(CaasppResult),
    /** All-grades CAASPP rows per district, keyed by district CDS. */
    districtCaaspp: z.record(z.string(), z.array(CaasppResult)),
    schools: z.array(SchoolRecord),
  })
  .strict();
export type FixtureFile = z.infer<typeof FixtureFile>;

const parsed = FixtureFile.parse(raw);

/**
 * The file holds grade spans as the state directory lists them. Like the
 * import, show the grades that actually have students (see servedSpan).
 */
export const fixtures: FixtureFile = {
  ...parsed,
  schools: parsed.schools.map((record) => {
    const listed = record.school.gradesServed;
    if (!listed || !record.enrollment) return record;
    const served = servedSpan(listed, record.enrollment.byGrade);
    return served === listed
      ? record
      : { ...record, school: { ...record.school, gradesServed: served } };
  }),
};
