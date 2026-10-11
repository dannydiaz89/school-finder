import { z } from "zod";

/**
 * Catalog of the public files and services the app reads, mirroring
 * `docs/data-sources.md`. Display strings live in the `data.sources.<id>`
 * messages; this file holds only identifiers and URLs.
 *
 * `fileUrl` is the exact download the importer fetches. Import runs are
 * recorded under that URL, so it is also the key the "Updated" column uses.
 * Services with no file (the geocoder) have `fileUrl: null`.
 */
/** Ids double as message keys: `data.sources.<id>.name` and `.takes`. */
export const DataSourceId = z.enum([
  "directory",
  "ccd",
  "edgePublic",
  "dashboard",
  "caaspp",
  "enrollment",
  "frpm",
  "staff",
  "affidavit",
  "pss",
  "geocoder",
]);
export type DataSourceId = z.infer<typeof DataSourceId>;

export const DataSourceEntry = z
  .object({
    id: DataSourceId,
    publisher: z.enum(["cde", "nces", "census"]),
    cadence: z.enum(["onRequest", "annual", "biennial", "live"]),
    /** Where a person can read about the file. */
    landingUrl: z.url(),
    /** The file the importer downloads, or null for a request-time service. */
    fileUrl: z.url().nullable(),
  })
  .strict();
export type DataSourceEntry = z.infer<typeof DataSourceEntry>;

export const DATA_SOURCES: DataSourceEntry[] = z.array(DataSourceEntry).parse([
  {
    id: "directory",
    publisher: "cde",
    cadence: "onRequest",
    landingUrl: "https://www.cde.ca.gov/ds/si/ds/pubschls.asp",
    fileUrl: "https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt",
  },
  {
    id: "ccd",
    publisher: "nces",
    cadence: "annual",
    landingUrl: "https://nces.ed.gov/ccd/files.asp",
    fileUrl: "https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2425_w_1a_073025.zip",
  },
  {
    id: "edgePublic",
    publisher: "nces",
    cadence: "annual",
    landingUrl: "https://nces.ed.gov/programs/edge/Geographic/SchoolLocations",
    fileUrl: "https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2425.zip",
  },
  {
    id: "dashboard",
    publisher: "cde",
    cadence: "annual",
    landingUrl: "https://www.cde.ca.gov/ta/ac/cm/",
    fileUrl: "https://www3.cde.ca.gov/researchfiles/cadashboard/",
  },
  {
    id: "caaspp",
    publisher: "cde",
    cadence: "annual",
    landingUrl: "https://caaspp-elpac.ets.org/caaspp/ResearchFileListSB",
    fileUrl: "https://caaspp-elpac.ets.org/caaspp/researchfiles/sb_ca2025_1_csv_v1.zip",
  },
  {
    id: "enrollment",
    publisher: "cde",
    cadence: "annual",
    landingUrl: "https://www.cde.ca.gov/ds/ad/fsenrcensus.asp",
    fileUrl: "https://www3.cde.ca.gov/demo-downloads/census/cdenroll2425.txt",
  },
  {
    id: "frpm",
    publisher: "cde",
    cadence: "annual",
    landingUrl: "https://www.cde.ca.gov/ds/ad/downloadabledata.asp",
    fileUrl: "https://www.cde.ca.gov/ds/ad/documents/frpm2425.xlsx",
  },
  {
    id: "staff",
    publisher: "cde",
    cadence: "annual",
    landingUrl: "https://www.cde.ca.gov/ds/ad/downloadabledata.asp",
    fileUrl: "https://www3.cde.ca.gov/demo-downloads/staff/strat2324.txt",
  },
  {
    id: "affidavit",
    publisher: "cde",
    cadence: "annual",
    landingUrl: "https://www.cde.ca.gov/ds/si/ps/",
    fileUrl: "https://www.cde.ca.gov/ds/si/ps/documents/privateschooldata2425.xlsx",
  },
  {
    id: "pss",
    publisher: "nces",
    cadence: "biennial",
    landingUrl: "https://nces.ed.gov/surveys/pss/pssdata.asp",
    fileUrl: "https://nces.ed.gov/surveys/pss/zip/pss2324_pu_csv.zip",
  },
  {
    id: "geocoder",
    publisher: "census",
    cadence: "live",
    landingUrl: "https://geocoding.geo.census.gov/geocoder/",
    fileUrl: null,
  },
]);
