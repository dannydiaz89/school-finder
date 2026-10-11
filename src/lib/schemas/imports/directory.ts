import { z } from "zod";

/**
 * One row of the CDE Public Schools and Districts directory file
 * (tab-delimited, UTF-8, CRLF). Column names are exactly as the file header
 * spells them. Blank and "No Data" become undefined before validation.
 *
 * Source: https://www.cde.ca.gov/ds/si/ds/pubschls.asp
 * Layout: https://www.cde.ca.gov/ds/si/ds/fspubschls.asp
 */

const NO_DATA = new Set(["", "No Data", "No"]);

/** Turn CDE's "No Data" (and a bare "No" in flag columns) into undefined. */
export const noData = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && NO_DATA.has(v.trim()) ? undefined : v),
    schema.optional(),
  );

const str = noData(z.string().trim().min(1));
const yn = noData(z.enum(["Y", "N"]));
/** CDE dates look like "1/15/2024" or "1/15/2024 12:00:00 AM" */
const usDate = noData(z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}/));
const num = noData(z.coerce.number());

export const DirectoryRow = z
  .object({
    CDSCode: z.string().regex(/^\d{14}$/),
    NCESDist: noData(z.string().regex(/^\d{7}$/)),
    NCESSchool: noData(z.string().regex(/^\d{5}$/)),
    StatusType: z.enum(["Active", "Closed", "Merged", "Pending"]),
    County: z.string().trim().min(1),
    District: z.string().trim().min(1),
    School: str,
    Street: str,
    StreetAbr: str,
    City: str,
    Zip: noData(z.string().regex(/^\d{5}(-\d{4})?$/)),
    State: noData(z.literal("CA")),
    MailStreet: str,
    MailStrAbr: str,
    MailCity: str,
    MailZip: str,
    MailState: str,
    Phone: str,
    Ext: str,
    FaxNumber: str,
    WebSite: str,
    OpenDate: usDate,
    ClosedDate: usDate,
    Charter: yn,
    CharterNum: str,
    FundingType: noData(z.enum(["Directly funded", "Locally funded", "Not in CS funding model"])),
    DOC: str,
    DOCType: str,
    SOC: str,
    SOCType: str,
    EdOpsCode: noData(
      z.enum([
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
      ]),
    ),
    EdOpsName: str,
    EILCode: noData(z.enum(["PS", "ELEM", "INTMIDJR", "ELEMHIGH", "HS", "A", "UG"])),
    EILName: str,
    GSoffered: str,
    GSserved: str,
    Virtual: noData(z.enum(["F", "V", "C", "N", "P"])),
    Magnet: yn,
    YearRoundYN: yn,
    FederalDFCDistrictID: str,
    Latitude: num,
    Longitude: num,
    AdmFName: str,
    AdmLName: str,
    LastUpDate: usDate,
    Multilingual: yn,
  })
  // The file may gain columns; ignore ones we do not know.
  .loose();
export type DirectoryRow = z.infer<typeof DirectoryRow>;

export const DIRECTORY_COLUMNS = Object.keys(DirectoryRow.shape) as (keyof DirectoryRow)[];
