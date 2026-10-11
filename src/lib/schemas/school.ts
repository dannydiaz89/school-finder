import { z } from "zod";
import {
  Affiliation,
  CdsCode,
  CharterFunding,
  Coordinates,
  EducationalOption,
  GradeSpan,
  InstructionLevel,
  IsoDate,
  NcesSchoolId,
  SchoolType,
  VirtualStatus,
} from "./common";

export const Address = z
  .object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    state: z.literal("CA"),
  })
  .strict();
export type Address = z.infer<typeof Address>;

/**
 * One school, public or private, as the app sees it. Every field that is not
 * known for a given source is optional rather than guessed. A private school
 * has no educationalOption, charterNumber, magnet, virtual, or multilingual;
 * a public school has no affiliation or pssId.
 */
export const School = z
  .object({
    cds: CdsCode,
    ncesId: NcesSchoolId.optional(),
    name: z.string().min(1),
    type: SchoolType,
    /** District name. For private schools, the public district the school sits in. */
    district: z.string().min(1),
    districtCds: CdsCode.optional(),
    county: z.string().min(1),
    address: Address,
    phone: z.string().optional(),
    website: z.url().optional(),
    coordinates: Coordinates.optional(),
    gradesOffered: GradeSpan.optional(),
    gradesServed: GradeSpan.optional(),
    instructionLevel: InstructionLevel.optional(),
    educationalOption: EducationalOption.optional(),
    charterNumber: z.string().optional(),
    charterFunding: CharterFunding.optional(),
    magnet: z.boolean().optional(),
    virtual: VirtualStatus.optional(),
    multilingual: z.boolean().optional(),
    openDate: IsoDate.optional(),
    affiliation: Affiliation.optional(),
    /** NCES Private School Survey id, when the private school was matched. */
    pssId: z.string().optional(),
    /** Date the source directory row was last updated. */
    directoryUpdatedAt: IsoDate.optional(),
  })
  .strict();
export type School = z.infer<typeof School>;
