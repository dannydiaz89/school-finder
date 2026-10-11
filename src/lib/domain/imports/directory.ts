import { School, type EducationalOption } from "@/lib/schemas";
import type { DirectoryRow } from "@/lib/schemas/imports/directory";
import { parseGradeSpan } from "../grades";
import { districtCdsOf, isDistrictCds, normalizeWebsite, usDateToIso } from "./common";

/**
 * CDE public school directory row -> School. Pure. The FRPM file names the
 * educational option in words; when the directory row lacks the code, the
 * FRPM wording fills it in so placements are still recognized.
 */

/** FRPM "Educational Option Type" wording -> directory EdOpsCode. */
export const FRPM_OPTION: Record<string, EducationalOption> = {
  Traditional: "TRAD",
  "Alternative School of Choice": "ALTSOC",
  "Alternative Schools of Choice": "ALTSOC",
  "Continuation School": "CON",
  "County Community School": "COMM",
  "Community Day School": "COMMDAY",
  "Opportunity School": "OPP",
  "Juvenile Court School": "JUV",
  "Youth Authority Facility": "YTH",
  "State Special School": "SSS",
  "Special Education School": "SPEC",
  "Special Education Consortia": "SPECON",
  "Home and Hospital": "HOMHOS",
  "Regional Occupational Program": "ROP",
};

export type DirectorySkipReason = "inactive" | "district" | "noName" | "noAddress";

export type DirectoryOutcome =
  { kind: "school"; school: School } | { kind: "skip"; reason: DirectorySkipReason };

export function schoolFromDirectoryRow(row: DirectoryRow, frpmOption?: string): DirectoryOutcome {
  if (row.StatusType !== "Active") return { kind: "skip", reason: "inactive" };
  if (isDistrictCds(row.CDSCode)) return { kind: "skip", reason: "district" };
  if (!row.School) return { kind: "skip", reason: "noName" };
  if (!row.Street || !row.City || !row.Zip) return { kind: "skip", reason: "noAddress" };

  const school = School.parse({
    cds: row.CDSCode,
    ncesId: row.NCESDist && row.NCESSchool ? row.NCESDist + row.NCESSchool : undefined,
    name: row.School,
    type: row.Charter === "Y" ? "charter" : "district",
    district: row.District,
    districtCds: districtCdsOf(row.CDSCode),
    county: row.County,
    address: { street: row.Street, city: row.City, zip: row.Zip.slice(0, 5), state: "CA" },
    phone: row.Phone,
    website: normalizeWebsite(row.WebSite),
    coordinates:
      row.Latitude !== undefined && row.Longitude !== undefined
        ? { latitude: row.Latitude, longitude: row.Longitude }
        : undefined,
    gradesOffered: parseGradeSpan(row.GSoffered),
    gradesServed: parseGradeSpan(row.GSserved),
    instructionLevel: row.EILCode,
    educationalOption: row.EdOpsCode ?? (frpmOption ? FRPM_OPTION[frpmOption] : undefined),
    charterNumber: row.CharterNum,
    charterFunding:
      row.FundingType === "Directly funded"
        ? "directly"
        : row.FundingType === "Locally funded"
          ? "locally"
          : row.FundingType
            ? "notInModel"
            : undefined,
    magnet: row.Magnet ? row.Magnet === "Y" : undefined,
    virtual: row.Virtual,
    multilingual: row.Multilingual ? row.Multilingual === "Y" : undefined,
    openDate: usDateToIso(row.OpenDate),
    directoryUpdatedAt: usDateToIso(row.LastUpDate),
  });
  return { kind: "school", school };
}
