# California school data sources

Verified 2026-10-11. All sources are public and free. Everything below is keyed by the 14-character CDS code (county 2 + district 5 + school 7) except where noted.

## Access warning

`www.cde.ca.gov` HTML pages and the School Directory report endpoint sit behind Radware bot protection. After a handful of automated requests they return a CAPTCHA. Static files under `www.cde.ca.gov/.../documents/*.xlsx`, everything on `www3.cde.ca.gov`, and `api.caschooldashboard.org` were not blocked.

Plan: fetch CDE files in a rare batch job (nightly or weekly), cache the results in our own database, never call CDE from the live request path.

**Status 2026-10-11:** the directory report endpoint was CAPTCHA-blocked for this machine after the research session, and the Internet Archive serves at most 5 MB of it. A full copy (18,409 rows) was downloaded by hand from a browser and lives at `.cache/cde/pubschls.txt` (gitignored). The fixture builder (`scripts/build-fixtures.ts`) takes public schools from that file first and falls back to the federal NCES CCD directory plus EDGE geocodes, with FRPM supplying the educational option, for any row the CDE file lacks. The Data workstream should do the same: prefer the cached CDE file, keep NCES as the fallback, and never fetch CDE at request time. Lessons from building the fixtures:

- NCES gives independent charters their own LEA id, so `ST_SCHID` is not a CDS code for them, and the 12-digit NCES id differs between the two files (CDE keeps the old district part). Match on the 5-digit school part (`NCESSchool` in CDE, last five digits of `NCESSCH` in CCD) and trust the CDE CDS.
- The EDGE geocode TXT has no header row. Column order is in `scripts/lib/parse.ts`.
- CAASPP research files store `Type ID`, `Student Group ID`, and `Grade` as unpadded numbers (`7`, `1`, `13`), not the zero-padded codes in the layout document.
- FRPM headers contain line breaks; normalize whitespace before matching. Its `Academic Year` is "2024-2025", the other files say "2024-25".
- In the NCES Private School Survey, the physical-address columns (`PL_*`) are blank when they equal the mailing address (`PADDRS`, `PCITY`, `PSTABB`, `PZIP`). Only 212 of 2,334 California rows have `PL_STABB` set.
- The CDE affidavit's `CDS Code` loses its leading zero; pad to 14 digits.

## Running the imports

Everything is in `scripts/import.ts` and runs on a developer machine, never in a request:

```bash
pnpm run import all                        # every source, statewide, default years
pnpm run import all --county Sacramento    # one county (by name or two-digit code)
pnpm run import dashboard --year 2025      # one source, one year (2024-25 or 2025 both work)
pnpm run import caaspp --dry-run           # parse, validate and transform without writing
pnpm run import history --years 2026       # Dashboard ratings and CAASPP scores for whole years
pnpm run import dashboard --year 2023 --indicator elpi   # one indicator file
pnpm run import search-rows                # maintenance: recompute every school's search row
pnpm run import prune-caaspp --year 2025   # one-time cleanup of per-grade test rows
```

`pnpm import` (without `run`) is pnpm's own lockfile command, so always say `pnpm run import`.

What a run does, per source: download into `.cache/<source>/` (skipped when the file is there), parse with `scripts/lib/parse.ts`, validate every row with the Zod row schema in `src/lib/schemas/imports/<source>.ts` (rejected rows are counted, the first few are logged, nothing is dropped silently), transform with the pure functions in `src/lib/domain/imports/<source>.ts`, and upsert in batches through the internal mutations in `convex/imports.ts`. Each run writes an `importRuns` row with the source, URL, year, rows read/rejected/written, timestamps and any error. Upserts are keyed (`cds`, plus year and indicator, or year, subject and grade). Nothing is deleted: a school that leaves the directory stays until pruned by hand.

### What an import costs, and how it is kept small

Convex bills database bandwidth: every byte read and every byte written, with a monthly allowance (1 GB on the free plan). The first two days of this project used nearly all of it, three quarters of it reads. Imports are written around that:

- **A row already stored is not rewritten.** Each write starts by reading what is stored for that school and year, and skips the write when the content is the same. A re-run costs those reads and no writes, and reports `new or changed 0`.
- **The Dashboard is written in one pass per school.** Its eight indicator files are all parsed first, then written ordered by school, so a school's stored rows are read once. Written file by file, the eighth file re-read the seven before it.
- **Only changed schools are refreshed.** Each school document stores its search row (`summary`, grid cell, search text, narrowed grade span). Imports report which schools they actually changed, and when the run ends only those are recomputed (`rebuildSummariesFor`). Meal counts and test scores do not feed a search row and refresh nothing; neither does a Dashboard year older than the current one. `--no-rebuild` skips the refresh entirely.
- **`search-rows` is maintenance, not part of an import.** It recomputes every school statewide, about five reads each. Run it only after changing how a summary or a grade span is computed.
- **Test scores are stored as the all-grades row only.** No screen shows per-grade results, and they were five times the rows. Data loaded before this change still holds per-grade rows for 2024-25; `prune-caaspp` deletes them. It lists the affected schools, districts and the state from the cached research file, so it scans nothing.
- **A directory re-import leaves unchanged schools alone.** The stored grade span is the directory's span narrowed to grades with students; while the directory's own span is unchanged the narrowed one is kept.

Queries follow the same rule. A search and the My schools page read one document per school. A school page reads that school's rows plus one year of district and state test rows. Nearby schools are found by widening a circle that starts at half a mile.

Credentials: `CONVEX_DEPLOY_KEY` (a deploy key from the dashboard) or, when unset, the login that `npx convex login` stored in `~/.convex/config.json`; the script then asks the Convex API for the dev deployment's admin key the same way `npx convex dev` does. The deployment comes from `.env.local`.

Sources, default years and cache paths:

| Source              | File                                                  | Default year | Writes                                  |
| ------------------- | ----------------------------------------------------- | ------------ | --------------------------------------- |
| `directory`         | `.cache/directory/pubschls.txt` (saved by hand)       | —            | `schools` + spatial index               |
| `dashboard`         | `.cache/dashboard/2025/*download2025.txt` (8 files)   | 2024-25      | `dashboard`                             |
| `caaspp`            | `.cache/caaspp/2025/sb_ca2025_1_csv_v1.txt`           | 2024-25      | `caaspp` (school, district, state rows) |
| `enrollment`        | `.cache/enrollment/cdenroll2425.txt`                  | 2024-25      | `enrollment`                            |
| `frpm`              | `.cache/frpm/frpm2425.xlsx`                           | 2024-25      | `frpm`                                  |
| `staff`             | `.cache/staff/strat2324.txt`                          | 2023-24      | `staffRatios`                           |
| `private-affidavit` | `.cache/private-affidavit/privateschooldata2425.xlsx` | 2024-25      | `privateDetails`                        |
| `private-pss`       | `.cache/private-pss/pss2324_pu.csv`                   | 2023-24      | `schools` (private, matched)            |

### Earlier years

`pnpm run import history --years 2023,2024` loads the Dashboard and CAASPP files for the school years ending in those years, next to the current year. Loaded so far: 2023, 2024 and 2025.

- The same command loads a new year when the state publishes it: `pnpm run import history --years 2026`. Run it with `--dry-run` first; a layout change shows up as rejected rows or an indicator with no school rows.
- Rows for a year older than the current one never change a search row, so loading them refreshes nothing.
- "Current" is always a school's newest year on file, decided in `src/lib/domain/history.ts`. Search rows, the compare table and the top of the school page use only that year; earlier years appear in the "By year" tables on the school page.
- The 2023 Dashboard has no science file, and its ELPI file has no student-group column: it holds one row per school, which the import takes as the all-students row. The 2023 College/Career indicator has a status but no color.
- Science changed unit: the 2024 Dashboard reports distance from standard in points with no color, and 2025 reports the percent of students who met or exceeded standard. `statusUnit(indicator, year)` returns the unit, and the school page says the two are not comparable.
- 2022 and earlier are not loaded. There was no Dashboard in 2020 or 2021, 2022 reported status without colors, and the 2018 and 2019 files have not been checked against the current row schema.

Notes learned while running them:

- The directory import reads the FRPM workbook from the cache, when present, to fill the educational option for the few rows whose `EdOpsCode` is `No Data`; run `frpm` first or accept a missing option for those.
- The ELPI file has no `ALL` student group; its all-students row is the `EL` group, which is what the import stores.
- The chronic absenteeism file spells `changeLevel` with a capital L; the row schema lowercases keys.
- Dashboard `statuslevel`/`changelevel` of 0 and `color` 0 or blank mean "no level" and are stored as null.
- Private schools: the affidavit has no address, so a private school gets a `schools` row only when it matches a PSS row (same county, normalized-name Dice score at least 0.8, ties within 0.05 left unmatched, each PSS row used once). The run writes `.cache/private-pss/match-report-<year>.tsv` with every affidavit school, its status (`matched`, `fuzzy`, `noAddress`, or `unmatched:<reason>`) and the best candidate. Fix wrong or missing matches by inserting into `privateSchoolOverrides` (`cds`, `pssId` or null to force no match, `note`) and re-running `private-pss`. For Sacramento County, 45 of 93 affidavit schools matched; PSS lists only 70 schools in the county and the rest are mostly home schools and very small schools PSS does not cover.

## Running the contract test

`src/lib/data/convex.contract.test.ts` loads the fixture records into the deployment in `.env.local`, then asserts that `convexDataSource` returns the same rows as `fixturesDataSource` for 17 search argument sets (3 and 4 miles, each type, each grade band, rating, programs, size, each sort key, paging) plus `getSchool` for every fixture school, `getNearby` and `getSchoolsByCds`. It **empties the data tables first**, so it is skipped unless `CONVEX_CONTRACT_TESTS=1`, and `pnpm check` stays offline:

```bash
npx convex dev --once                                            # push the functions
CONVEX_CONTRACT_TESTS=1 pnpm test src/lib/data/convex.contract.test.ts
pnpm run import all --county Sacramento                          # put real data back
```

`convex-test` was not used: the radius query runs inside the geospatial component, and the dev deployment is the implementation the app ships against.

## Verification

Dev deployment `the-dev-deployment`, 2026-10-11, after `pnpm run import all --county Sacramento` and `--county Yolo`.

Rows written (Sacramento + Yolo): 468 public schools, 2,799 Dashboard rows (eight indicators), 4,366 CAASPP rows (school, district and state), 467 enrollment, 467 FRPM, 465 staff ratios, 103 private affidavit details, 52 private schools placed via PSS. Zero rows rejected by any row schema across 1.3 million rows read.

`pnpm tsx scripts/spot-check.ts` compared the 32 public fixture schools with `api.caschooldashboard.org` (2025 Dashboard): all 198 indicator values the site shows for them (status, change and performance level, every indicator) agree with the import. One difference needed explaining: when the English Learner Progress Indicator has fewer than 30 students the research file leaves `change` blank and the site prints `0` with no change level; the import keeps null and the script treats the two as the same. Examples, as shown on the site: Paso Verde ELA -22.7 orange, Math -66.6 orange, chronic absenteeism 16.6 yellow, suspension 10.1 red; William Land Elementary ELA and Math blue. Run the script for the full table; it exits non-zero on any disagreement.

The adapter contract test (`CONVEX_CONTRACT_TESTS=1`) passed 21 of 21 cases against the same deployment before the real import.

## 1. Public school directory (CDE "pubschls")

|               |                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Landing       | https://www.cde.ca.gov/ds/si/ds/pubschls.asp                                                                  |
| TXT download  | https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt (302 to `sd.cde.ca.gov`, ~8.8 MB, tab-delimited) |
| XLSX download | https://www.cde.ca.gov/SchoolDirectory/report?rid=dl1&tp=xlsx&ict=Y (~4 MB)                                   |
| Layout        | https://www.cde.ca.gov/ds/si/ds/fspubschls.asp                                                                |
| Refresh       | Generated live on request; `LastUpDate` per row                                                               |

Columns (46): `CDSCode, NCESDist, NCESSchool, StatusType, County, District, School, Street, StreetAbr, City, Zip, State, MailStreet, MailStrAbr, MailCity, MailZip, MailState, Phone, Ext, FaxNumber, WebSite, OpenDate, ClosedDate, Charter, CharterNum, FundingType, DOC, DOCType, SOC, SOCType, EdOpsCode, EdOpsName, EILCode, EILName, GSoffered, GSserved, Virtual, Magnet, YearRoundYN, FederalDFCDistrictID, Latitude, Longitude, AdmFName, AdmLName, LastUpDate, Multilingual`

Useful value domains:

- `StatusType`: Active / Closed / Merged / Pending. Filter to Active.
- `Charter`: Y/N. `FundingType`: Directly funded / Locally funded / Not in CS funding model.
- `SOC` (school type): 60 Elementary, 62 Intermediate/Middle, 64 Junior High, 65 K-12, 66 High School, 63 Alternative Schools of Choice, 68 Continuation, 08 Preschool, 09 Special Ed, etc.
- `EILCode`: ELEM, INTMIDJR, HS, ELEMHIGH, PS, A, UG.
- `Virtual`: F exclusively virtual, V primarily virtual, C primarily classroom, N not virtual.
- `Magnet`: Y/N. `GSoffered` vs `GSserved` (served comes from actual enrollment).

Gotchas:

- UTF-8, CRLF, tab-delimited, one header row.
- Missing values are the literal string `No Data`, not blank.
- Includes closed and merged schools (about 37% of rows). Filter `StatusType = Active` and drop CDS codes ending in `0000000` (those are district/county records).
- Lat/long present for nearly every active school, in decimal degrees.
- `NCESDist` + `NCESSchool` = 12-digit `NCESSCH` for joining to NCES files.

## 2. Private schools

### 2a. CDE Private School Affidavit (annual XLSX)

- 2024-25: https://www.cde.ca.gov/ds/si/ps/documents/privateschooldata2425.xlsx (430 KB). Prior years use the same path with `2324`, `2223`, etc.
- Only schools with 6+ students. One sheet, 5 title rows, header on row 6, about 2,960 rows.
- Columns: `CDS Code, County, Public School District, School Name, Grade K ... Grade 12 Enroll, Total Enrollment, Previous Year Grads, Full Time Teachers, Part Time Teachers, Administrators, Other Staff, Tax Exempt 501(c)(3) - Fed, Tax Exempt 27301d - CA, Tax Exempt 214 - CA, Tax Exempt`
- Does NOT include address, phone, lat/long, or religious affiliation. Grade span must be derived from non-zero grade columns.
- `CDS Code` is stored numeric, so the leading zero is dropped (13 digits). Zero-pad to 14.
- Posted annually around July.

### 2b. CDE School Directory private-school export

- https://www.cde.ca.gov/SchoolDirectory/active-or-pending-schools/2 offers an export with contact info. Whether it includes lat/long is unverified (bot-blocked during research).

### 2c. NCES Private School Universe Survey (PSS), has lat/long and affiliation

- Data page: https://nces.ed.gov/surveys/pss/pssdata.asp. Latest is 2023-24 (biennial; 2025-26 due spring 2027).
- CSV: https://nces.ed.gov/surveys/pss/zip/pss2324_pu_csv.zip (4 MB). Layout: https://nces.ed.gov/surveys/pss/pdf/layout2023_24.pdf
- Key variables: `PPIN` (key), `PINST` (name), `PL_ADD / PL_CIT / PL_STABB / PL_ZIP` (physical address), `LATITUDE24`, `LONGITUDE24`, `LOGR2024 / HIGR2024` (grade span), `NUMSTUDS`, `RELIG` (affiliation), `ORIENT`, `TYPOLOGY`.
- No CDS code. Join to the CDE affidavit by name + zip fuzzy match.

Private schools do not take state tests and have no Dashboard ratings. Show "Not rated" rather than blanks.

## 3. California School Dashboard research files

Latest: 2025 Dashboard (2024-25 data), released 13 Nov 2025. Hub: https://www.cde.ca.gov/ta/ac/cm/

All files are TXT (tab) or XLSX on `www3.cde.ca.gov/researchfiles/cadashboard/`, one row per entity per student group. Use `rtype = S` and `studentgroup = ALL` for the school-level row.

| Indicator                | 2025 TXT file             | Layout page                               |
| ------------------------ | ------------------------- | ----------------------------------------- |
| ELA                      | `eladownload2025.txt`     | https://www.cde.ca.gov/ta/ac/cm/ela24.asp |
| Math                     | `mathdownload2025.txt`    | `math24.asp`                              |
| Chronic absenteeism      | `chronicdownload2025.txt` | `chronic24.asp`                           |
| Suspension rate          | `suspdownload2025.txt`    | `suspindicator24.asp`                     |
| Graduation rate          | `graddownload2025.txt`    | `gradindicator24.asp`                     |
| College/Career           | `ccidownload2025.txt`     | `ccdata2024.asp`                          |
| English Learner Progress | `elpidownload2025.txt`    | `elpi24.asp`                              |
| Science (new 2025)       | `sciencedownload2025.txt` |                                           |

Full URL pattern: `https://www3.cde.ca.gov/researchfiles/cadashboard/eladownload2025.txt`

Shared columns: `cds, rtype, schoolname, districtname, countyname, charter_flag, coe_flag, dass_flag, studentgroup, currdenom, currstatus, priorstatus, change, statuslevel, changelevel, color, box, currnsizemet, accountabilitymet, indicator, reportingyear`.

- `color`: 1 Red, 2 Orange, 3 Yellow, 4 Green, 5 Blue, 0 none.
- `currstatus` for ELA/Math is Distance From Standard in scale-score points (e.g. `-51.3`).
- Minimum n-size is 30; small schools have no color.

Gotcha: `www3.cde.ca.gov` returns 303 to HEAD requests but 200 to GET.

### Undocumented Dashboard JSON API

Found by watching the Dashboard SPA. Open, no key. Fragile, so use only as a cross-check.

- `GET https://api.caschooldashboard.org/LEAs/schoolYears`
- `GET https://api.caschooldashboard.org/LEAs/{cds}/{schoolYearId}/true` (profile: address, enrollment, charter, grade span)
- `GET https://api.caschooldashboard.org/Reports/{cds}/{schoolYearId}/SummaryCards` (8 indicators with status, change, performance 1-5)

## 4. CAASPP (Smarter Balanced) test results

- File list: https://caaspp-elpac.ets.org/caaspp/ResearchFileListSB (the old `cde.ca.gov` URL now redirects here).
- Latest: 2024-25 (test year 2025).
- Statewide file, all students only: https://caaspp-elpac.ets.org/caaspp/researchfiles/sb_ca2025_1_csv_v1.zip (7.8 MB zip, 30 MB unzipped). All student groups: `sb_ca2025_all_csv_v1.zip` (154 MB).
- Entities lookup: `sb_ca2025entities_csv.zip`. Layout: https://caaspp-elpac.ets.org/caaspp/docs/2025_SBAC_Research%20File%20Layout.xlsx
- Format gotcha: the "csv" zip holds a `.txt` that is caret (`^`) delimited.
- Key: `County Code ^ District Code ^ School Code` + `Type ID` (07 school, 09 direct-funded charter, 10 locally-funded charter) + `Test ID` (1 ELA, 2 Math) + `Student Group ID` (001 all) + `Grade` (13 = all grades).
- Columns include `Percentage Standard Met and Above`, `Mean Scale Score`, and per-level counts. Groups under 11 students are suppressed.

## 5. Other CDE files

| Dataset                   | File                                                                        | Notes                                                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Census Day enrollment     | https://www3.cde.ca.gov/demo-downloads/census/cdenroll2425.txt (31 MB, tab) | Filter `AggregateLevel = S`, `ReportingCategory = TA` for totals; columns `TOTAL_ENR, GR_TK ... GR_12`, plus race/gender/EL breakdowns in other rows. `*` = suppressed. Layout: https://www.cde.ca.gov/ds/ad/fsenrcensus.asp |
| Free/reduced meals (FRPM) | https://www.cde.ca.gov/ds/ad/documents/frpm2425.xlsx (2.2 MB)               | Sheet "FRPM School-Level Data", header on row 2. Percents stored as fractions. Also carries charter flag and grade span.                                                                                                     |
| Student/staff ratios      | https://www3.cde.ca.gov/demo-downloads/staff/strat2324.txt (3.4 MB)         | Latest posted is 2023-24. `TCH_FTE_N`, `STU_TCH_RATIO`. FTE values contain thousands separators.                                                                                                                             |
| Downloadable files index  | https://www.cde.ca.gov/ds/ad/downloadabledata.asp                           | Also chronic absenteeism, graduation/dropout, staff demographics.                                                                                                                                                            |

## 6. NCES national files (optional, for cross-checks and private-school geocodes)

- CCD school directory 2024-25: https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2425_w_1a_073025.zip (12 MB). Key `NCESSCH`. No lat/long.
- EDGE public school geocodes 2024-25: https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2425.zip (30 MB). `LAT`, `LON`, locale codes.
- EDGE private school geocodes 2023-24: https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PRIVATESCH_2324.zip (6 MB). Key `PPIN`.

## 7. Attendance boundaries

- NCES SABS, 2015-16, was the final collection: https://nces.ed.gov/programs/edge/SABS (shapefile 556 MB). Old but still the only statewide-ish layer.
- No current statewide California boundary dataset exists. Large districts publish their own GIS.
- Plan: show "likely in boundary" from SABS labelled as 2015-16 data, and link to the district's own locator.

## 8. Geocoding the user's address

| Service            | Terms                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| US Census Geocoder | Free, no key, server-side only (no CORS). `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=...&benchmark=Public_AR_Current&format=json`. Street-level accuracy. |
| Nominatim (OSM)    | 1 request/sec, identifying User-Agent required, no autocomplete, results must be cached. Prototype only.                                                                                   |
| Mapbox Geocoding   | 100k requests/month free (temporary results), then $0.75 per 1k. Permanent (storable) $5 per 1k.                                                                                           |
| Google Geocoding   | 10k free/month then $5 per 1k. Results must be displayed on a Google map.                                                                                                                  |

Recommendation: Census geocoder server-side for the MVP, with Mapbox autocomplete later if typing full addresses feels clunky.

### City and ZIP code lookup (in use)

A search for a city or ZIP code is resolved locally from the Census Bureau Gazetteer files, with no network call. The Census geocoder only understands street addresses.

- Places (cities, towns, unincorporated communities): https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_gaz_place_06.txt (pipe-delimited; `NAME` ends in "city", "town", or "CDP"; `INTPTLAT`, `INTPTLONG` are the internal point).
- ZIP Code Tabulation Areas: https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip (national; California is 90001 to 96162).
- `pnpm tsx scripts/build-places.ts --places <file> --zcta <file>` writes `src/features/search/places.json` (1,595 names, 1,802 ZIP code areas, 109 KB, server-side only). Rebuild yearly.
- When two places share a name, an incorporated city wins over a community, then the larger one. Names in parentheses ("San Buenaventura (Ventura)") are findable either way. Accents are optional.
- A city's point is the center of its legal boundary, which for a sprawling city is not downtown: "Los Angeles" lands near Culver City.
- Neighborhood names (Midtown, Land Park) are not in the file and are reported as not found.

## 9. Existing aggregators

- GreatSchools API: open signups, 15k calls/month included, caching not permitted, logo attribution mandatory, pricing unpublished.
- SchoolDigger API: free tier 20 calls/day, paid from $19.90/month. No boundaries.
- Niche: no public API.

None are needed. The state and federal files above cover everything in the mockups.

## Operating notes

- Convex printed "Your projects are approaching the Free plan limits" on 2026-10-12, after the statewide imports, the history import and one search-row rebuild in the same month. Check https://dashboard.convex.dev/t/dannydiaz89/settings/usage before any import, and do not run `import all` or `search-rows` again this billing month without looking.

- **The contract test wipes the deployment it runs against.** `CONVEX_CONTRACT_TESTS=1 pnpm test src/lib/data/convex.contract.test.ts` clears every data table and loads the 40 fixture schools. Run it against a throwaway Convex deployment, or re-run `pnpm run import all` afterwards (about ten minutes with a warm `.cache/`).
- **Search rows.** An import refreshes the stored search row of the schools it changed. `pnpm run import search-rows` recomputes all of them and is for maintenance only (see "What an import costs").
- **Testing Convex functions.** `src/lib/data/convex-functions.test.ts` runs the queries and import mutations in memory with `convex-test`, as part of `pnpm test`. It checks every query against the fixtures adapter and checks that imports write and refresh only what changed. Use it instead of the contract test unless a real deployment is the thing being tested.
- **Clearing cached pages.** Pages cache school data for hours. `pnpm run import` calls `POST /api/revalidate` when it finishes, which needs `REVALIDATE_SECRET` in the env file and, when the app is not on localhost:3000, `APP_URL`. Without the secret the import says so and pages catch up when the cache expires.
- **Grade spans.** The directory's `GSoffered` and `GSserved` are self-reported and list an end grade with no students for about 4% of schools (380 of 9,781): Downey High is listed 8-12 with no 8th graders among 4,051 students, Vacaville High 4-12 with everyone in 9-12. The app shows the listed span trimmed to grades with Census Day students (`trimSpanToEnrollment`), and a school's own page also shows the directory's listing when it differs. The rule only trims; it never adds a grade. A school that added a grade after the enrollment file's year reads one grade short until the next file.
- **Deploy order.** Deploy Convex functions before the web app. New result fields carry defaults so a brief mismatch does not break pages.

## Unverified

1. Whether the CDE directory private-school export carries lat/long.
2. Dashboard API `indicatorId` to name mapping.
3. Penn State LSABS boundary release status.
