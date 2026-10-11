/**
 * Build src/fixtures/schools.json from downloaded public files.
 *
 * Usage:
 *   pnpm tsx scripts/build-fixtures.ts \
 *     --ccd <ccd_sch_029_*.csv> --edge <EDGE_GEOCODE_PUBLICSCH_*.TXT> \
 *     --cde-directory <pubschls.txt> (optional, may be partial) \
 *     --dashboard <dir with eladownload2025.txt, mathdownload2025.txt, chronicdownload2025.txt, ...> \
 *     --caaspp <sb_ca2025_1_csv_v1.txt> --frpm <frpm2425.xlsx> --staff <strat2324.txt> \
 *     --enrollment <cdenroll2425.txt> --pss <pss2324_pu.csv> --affidavit <privateschooldata2425.xlsx> \
 *     --center 38.5816,-121.4944 --radius-miles 3.5 --max-public 32 --max-private 8 \
 *     --out src/fixtures/schools.json
 *
 * Every value in the output comes from a file; nothing is estimated. Schools
 * are chosen by distance from the center so the sample resembles a real
 * search. The CDE directory is the preferred source for public schools; when
 * it is missing or partial (CDE's site blocks automated downloads), NCES CCD
 * plus EDGE geocodes fill in, with FRPM supplying the educational option.
 */
import { existsSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import {
  Affiliation,
  CaasppResult,
  DashboardIndicator,
  DashboardIndicatorId,
  EducationalOption,
  Enrollment,
  Frpm,
  GradeCount,
  InstructionLevel,
  PrivateSchoolDetail,
  School,
  SchoolRecord,
  StaffRatio,
  VirtualStatus,
  type Coordinates,
  type Grade,
  type RaceEthnicity,
} from "../src/lib/schemas";
import { DirectoryRow } from "../src/lib/schemas/imports/directory";
import { haversineMeters, milesToMeters } from "../src/lib/domain/geo";
import { parseGradeSpan } from "../src/lib/domain/grades";
import { colorCodeToLevel } from "../src/lib/domain/levels";
import {
  EDGE_PUBLIC_COLUMNS,
  cdsFromParts,
  normalizeSchoolYear,
  numberOrNull,
  padCds,
  readDelimited,
  readSheet,
  type Row,
} from "./lib/parse";

const { values: args } = parseArgs({
  options: {
    ccd: { type: "string" },
    edge: { type: "string" },
    "cde-directory": { type: "string" },
    dashboard: { type: "string" },
    caaspp: { type: "string" },
    frpm: { type: "string" },
    staff: { type: "string" },
    enrollment: { type: "string" },
    pss: { type: "string" },
    affidavit: { type: "string" },
    center: { type: "string", default: "38.5816,-121.4944" },
    "radius-miles": { type: "string", default: "4" },
    "max-public": { type: "string", default: "32" },
    "max-private": { type: "string", default: "8" },
    out: { type: "string", default: "src/fixtures/schools.json" },
  },
});

function need(name: keyof typeof args): string {
  const v = args[name];
  if (!v || !existsSync(String(v)))
    throw new Error(`--${name} is required and must exist (got ${v})`);
  return String(v);
}

const [centerLat, centerLng] = String(args.center).split(",").map(Number);
const center: Coordinates = { latitude: centerLat, longitude: centerLng };
const radiusMeters = milesToMeters(Number(args["radius-miles"]));
const maxPublic = Number(args["max-public"]);
const maxPrivate = Number(args["max-private"]);
const today = new Date().toISOString().slice(0, 10);

const log = (...parts: unknown[]) => console.error(...parts);

// ---------------------------------------------------------------------------
// Public schools: CDE directory (preferred) + NCES CCD/EDGE (fallback)
// ---------------------------------------------------------------------------

const GSLO_MAP: Record<string, Grade> = { PK: "P", KG: "K", AE: "A" };
function ccdGrade(code: string): Grade | undefined {
  if (code in GSLO_MAP) return GSLO_MAP[code];
  const n = Number(code);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? (String(n) as Grade) : undefined;
}

const CCD_LEVEL: Record<string, InstructionLevel> = {
  Elementary: "ELEM",
  Middle: "INTMIDJR",
  High: "HS",
  Secondary: "HS",
  "Adult Education": "A",
  Prekindergarten: "PS",
  Ungraded: "UG",
};

const FRPM_OPTION: Record<string, EducationalOption> = {
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

type PublicCandidate = { school: School; distance: number };

function loadFrpm(path: string) {
  return readSheet(path, "FRPM School-Level Data", 2);
}

function frpmRowCds(row: Row): string {
  const key = (name: string) => Object.keys(row).find((k) => k.startsWith(name)) ?? name;
  return cdsFromParts(row[key("County Code")], row[key("District Code")], row[key("School Code")]);
}

async function loadPublicSchools(): Promise<{
  candidates: PublicCandidate[];
  frpmByCds: Map<string, Row>;
}> {
  const frpmRows = await loadFrpm(need("frpm"));
  const frpmByCds = new Map<string, Row>();
  const frpmOptionKey =
    Object.keys(frpmRows[0] ?? {}).find((k) => k.startsWith("Educational Option")) ?? "";
  for (const row of frpmRows) frpmByCds.set(frpmRowCds(row), row);
  log(
    `FRPM rows: ${frpmRows.length}; option values:`,
    [...new Set(frpmRows.map((r) => r[frpmOptionKey]))].join(" | "),
  );

  // EDGE geocodes keyed by NCESSCH
  const edge = new Map<string, Row>();
  for (const row of readDelimited(need("edge"), "|", EDGE_PUBLIC_COLUMNS))
    edge.set(row.NCESSCH, row);

  // Partial CDE directory, if present
  const cde = new Map<string, DirectoryRow>();
  const cdeByNces = new Map<string, DirectoryRow>();
  if (args["cde-directory"] && existsSync(args["cde-directory"])) {
    for (const raw of readDelimited(args["cde-directory"], "\t")) {
      const parsed = DirectoryRow.safeParse(raw);
      if (!parsed.success) continue;
      cde.set(parsed.data.CDSCode, parsed.data);
      if (parsed.data.NCESSchool) cdeByNces.set(parsed.data.NCESSchool, parsed.data);
    }
    log(`CDE directory rows parsed: ${cde.size}`);
  }

  const candidates: PublicCandidate[] = [];
  const fromCde = new Set<string>();
  for (const dir of cde.values()) {
    if (dir.StatusType !== "Active" || dir.CDSCode.endsWith("0000000")) continue;
    if (dir.Latitude === undefined || dir.Longitude === undefined || !dir.School) continue;
    const coordinates = { latitude: dir.Latitude, longitude: dir.Longitude };
    const distance = haversineMeters(center, coordinates);
    if (distance > radiusMeters) continue;
    const frpm = frpmByCds.get(dir.CDSCode);
    if (!frpm) continue;
    const school = schoolFromDirectory(dir, frpm[frpmOptionKey]);
    if (!school) continue;
    candidates.push({ school, distance });
    fromCde.add(dir.CDSCode);
  }
  log(`Public schools from the CDE directory: ${candidates.length}`);

  for (const row of readDelimited(need("ccd"), ",")) {
    if (row.ST !== "CA") continue;
    if (!["1", "3", "8"].includes(row.SY_STATUS)) continue; // open, new, reopened
    const m = /^CA-(\d{7})-(\d{7})$/.exec(row.ST_SCHID);
    if (!m) continue;
    // NCES gives independent charters their own LEA id, so the state id is not a CDS code there.
    // The CDE directory row (matched by NCES id) is authoritative; without it, skip untrusted ids.
    const dirByNces = cdeByNces.get(row.NCESSCH.slice(-5));
    if (dirByNces && fromCde.has(dirByNces.CDSCode)) continue; // already taken from the CDE file
    const cds = dirByNces?.CDSCode ?? (m[1] === m[2] ? undefined : m[1] + m[2]);
    if (!cds) continue;
    const geo = edge.get(row.NCESSCH);
    if (!geo) continue;
    const coordinates = { latitude: Number(geo.LAT), longitude: Number(geo.LON) };
    const distance = haversineMeters(center, coordinates);
    if (distance > radiusMeters) continue;

    const dir = dirByNces ?? cde.get(cds);
    const frpm = frpmByCds.get(cds);
    // A public school with no FRPM row has no enrollment this year (new or inactive); skip it.
    if (!frpm) continue;
    const isCharter = dir ? dir.Charter === "Y" : row.CHARTER_TEXT === "Yes";
    const low = ccdGrade(row.GSLO);
    const high = ccdGrade(row.GSHI);
    const offered = dir ? parseGradeSpan(dir.GSoffered) : low && high ? { low, high } : undefined;
    const served = dir ? parseGradeSpan(dir.GSserved) : undefined;
    const option = dir?.EdOpsCode ?? (frpm ? FRPM_OPTION[frpm[frpmOptionKey]] : undefined);
    const level =
      dir?.EILCode ??
      CCD_LEVEL[row.LEVEL] ??
      (offered && offered.low === "K" && offered.high === "12" ? "ELEMHIGH" : undefined);
    const website = (dir?.WebSite ?? row.WEBSITE ?? "").trim();
    const normalizedSite = website
      ? website.startsWith("http")
        ? website
        : `https://${website}`
      : undefined;

    const school: School = School.parse({
      cds,
      ncesId: row.NCESSCH,
      name: dir?.School ?? row.SCH_NAME,
      type: isCharter ? "charter" : "district",
      district: dir?.District ?? row.LEA_NAME,
      districtCds: cds.slice(0, 7) + "0000000",
      county: dir?.County ?? geo.NMCNTY.replace(/ County$/, ""),
      address: {
        street: dir?.Street ?? row.LSTREET1,
        city: dir?.City ?? row.LCITY,
        zip: (dir?.Zip ?? row.LZIP).slice(0, 5),
        state: "CA",
      },
      phone: dir?.Phone ?? (row.PHONE || undefined),
      website:
        normalizedSite && /^https?:\/\/[^\s]+\.[^\s]+$/.test(normalizedSite)
          ? normalizedSite
          : undefined,
      coordinates:
        dir?.Latitude && dir?.Longitude
          ? { latitude: dir.Latitude, longitude: dir.Longitude }
          : coordinates,
      gradesOffered: offered,
      gradesServed: served,
      instructionLevel: level,
      educationalOption: option,
      charterNumber: dir?.CharterNum,
      charterFunding:
        dir?.FundingType === "Directly funded"
          ? "directly"
          : dir?.FundingType === "Locally funded"
            ? "locally"
            : dir?.FundingType
              ? "notInModel"
              : undefined,
      magnet: dir?.Magnet ? dir.Magnet === "Y" : undefined,
      virtual: dir?.Virtual ? VirtualStatus.parse(dir.Virtual) : undefined,
      multilingual: dir?.Multilingual ? dir.Multilingual === "Y" : undefined,
      openDate: dir?.OpenDate ? usDateToIso(dir.OpenDate) : undefined,
      directoryUpdatedAt: dir?.LastUpDate ? usDateToIso(dir.LastUpDate) : undefined,
    });
    candidates.push({ school, distance });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return { candidates, frpmByCds };
}

function schoolFromDirectory(
  dir: DirectoryRow,
  frpmOption: string | undefined,
): School | undefined {
  if (!dir.Street || !dir.City || !dir.Zip) return undefined;
  const website = (dir.WebSite ?? "").trim();
  const normalizedSite = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : undefined;
  return School.parse({
    cds: dir.CDSCode,
    ncesId: dir.NCESDist && dir.NCESSchool ? dir.NCESDist + dir.NCESSchool : undefined,
    name: dir.School,
    type: dir.Charter === "Y" ? "charter" : "district",
    district: dir.District,
    districtCds: dir.CDSCode.slice(0, 7) + "0000000",
    county: dir.County,
    address: { street: dir.Street, city: dir.City, zip: dir.Zip.slice(0, 5), state: "CA" },
    phone: dir.Phone,
    website:
      normalizedSite && /^https?:\/\/[^\s]+\.[^\s]+$/.test(normalizedSite)
        ? normalizedSite
        : undefined,
    coordinates: { latitude: dir.Latitude, longitude: dir.Longitude },
    gradesOffered: parseGradeSpan(dir.GSoffered),
    gradesServed: parseGradeSpan(dir.GSserved),
    instructionLevel: dir.EILCode,
    educationalOption: dir.EdOpsCode ?? (frpmOption ? FRPM_OPTION[frpmOption] : undefined),
    charterNumber: dir.CharterNum,
    charterFunding:
      dir.FundingType === "Directly funded"
        ? "directly"
        : dir.FundingType === "Locally funded"
          ? "locally"
          : dir.FundingType
            ? "notInModel"
            : undefined,
    magnet: dir.Magnet ? dir.Magnet === "Y" : undefined,
    virtual: dir.Virtual ? VirtualStatus.parse(dir.Virtual) : undefined,
    multilingual: dir.Multilingual ? dir.Multilingual === "Y" : undefined,
    openDate: dir.OpenDate ? usDateToIso(dir.OpenDate) : undefined,
    directoryUpdatedAt: dir.LastUpDate ? usDateToIso(dir.LastUpDate) : undefined,
  });
}

function usDateToIso(us: string): string {
  const [m, d, y] = us.split(" ")[0].split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Private schools: NCES PSS (coordinates, affiliation) + CDE affidavit (counts)
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(
      /\b(school|schools|elementary|academy|the|of|and|inc|catholic|christian|parish|private|preparatory|prep|k 8|k 12)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function typologyToAffiliation(typology: string): Affiliation | undefined {
  const n = Number(typology);
  if (n >= 1 && n <= 3) return "catholic";
  if (n >= 4 && n <= 6) return "otherReligious";
  if (n >= 7 && n <= 9) return "nonsectarian";
  return undefined;
}

async function loadPrivateSchools(
  county: string,
): Promise<{ school: School; detail: PrivateSchoolDetail; distance: number }[]> {
  const affidavit = await readSheet(need("affidavit"), await firstSheetName(need("affidavit")), 6);
  const affKey = (row: Row, name: string) =>
    row[Object.keys(row).find((k) => k.toLowerCase().startsWith(name.toLowerCase())) ?? ""] ?? "";
  const affRows = affidavit.filter(
    (r) => affKey(r, "County").trim().toLowerCase() === county.toLowerCase(),
  );
  log(`Affidavit rows in ${county}: ${affRows.length}`);

  const out: { school: School; detail: PrivateSchoolDetail; distance: number }[] = [];
  for (const row of readDelimited(need("pss"), ",")) {
    // Physical-location fields are blank when they equal the mailing address.
    if ((row.PL_STABB || row.PSTABB) !== "CA") continue;
    if (!row.PCNTNM?.toLowerCase().startsWith(county.toLowerCase())) continue;
    const coordinates = { latitude: Number(row.LATITUDE24), longitude: Number(row.LONGITUDE24) };
    if (!Number.isFinite(coordinates.latitude)) continue;
    const distance = haversineMeters(center, coordinates);
    if (distance > radiusMeters) continue;

    const target = normalizeName(row.PINST);
    const match = affRows.find((a) => normalizeName(affKey(a, "School Name")) === target);
    if (!match) {
      log(`  no affidavit match for PSS "${row.PINST}" (${target})`);
      continue;
    }
    const cds = padCds(affKey(match, "CDS Code"));
    const byGrade: GradeCount[] = [];
    for (const g of ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const) {
      const key = Object.keys(match).find(
        (k) => k.replace(/\s+/g, " ").toLowerCase() === `grade ${g} enroll`.toLowerCase(),
      );
      const count = key ? numberOrNull(match[key]) : null;
      if (count && count > 0) byGrade.push({ grade: g, count });
    }
    const grades = byGrade.length
      ? { low: byGrade[0].grade, high: byGrade[byGrade.length - 1].grade }
      : undefined;
    const school = School.parse({
      cds,
      name: affKey(match, "School Name").trim(),
      type: "private",
      district: affKey(match, "Public School District").trim() || "Unknown",
      county,
      address: {
        street: (row.PL_ADD || row.PADDRS).trim(),
        city: titleCase((row.PL_CIT || row.PCITY).trim()),
        zip: (row.PL_ZIP || row.PZIP).slice(0, 5),
        state: "CA",
      },
      coordinates,
      gradesOffered: grades,
      affiliation: typologyToAffiliation(row.TYPOLOGY),
      pssId: row.PPIN,
    });
    const detail = PrivateSchoolDetail.parse({
      cds,
      year: "2024-25",
      enrollmentByGrade: byGrade,
      totalEnrollment:
        numberOrNull(affKey(match, "Total Enrollment")) ?? byGrade.reduce((s, g) => s + g.count, 0),
      fullTimeTeachers: numberOrNull(affKey(match, "Full Time Teachers")) ?? 0,
      partTimeTeachers: numberOrNull(affKey(match, "Part Time Teachers")) ?? 0,
      administrators: numberOrNull(affKey(match, "Administrators")) ?? 0,
      otherStaff: numberOrNull(affKey(match, "Other Staff")) ?? 0,
      previousYearGraduates: numberOrNull(affKey(match, "Previous Year Grads")),
    });
    out.push({ school, detail, distance });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out;
}

async function firstSheetName(path: string): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb.worksheets[0].name;
}

// ---------------------------------------------------------------------------
// Per-school measures
// ---------------------------------------------------------------------------

const DASHBOARD_FILES: Record<DashboardIndicatorId, string> = {
  ela: "eladownload2025.txt",
  math: "mathdownload2025.txt",
  chronicAbsenteeism: "chronicdownload2025.txt",
  suspension: "suspdownload2025.txt",
  graduation: "graddownload2025.txt",
  collegeCareer: "ccidownload2025.txt",
  elpi: "elpidownload2025.txt",
  science: "sciencedownload2025.txt",
};

function loadDashboard(cdsSet: Set<string>): Map<string, DashboardIndicator[]> {
  const dir = need("dashboard");
  const out = new Map<string, DashboardIndicator[]>();
  for (const [indicator, file] of Object.entries(DASHBOARD_FILES) as [
    DashboardIndicatorId,
    string,
  ][]) {
    const candidates = [join(dir, file), join(dir, file.replace(/\.txt$/, ".head"))];
    const path = candidates.find((p) => existsSync(p));
    if (!path) {
      log(`  dashboard: no file for ${indicator}`);
      continue;
    }
    let n = 0;
    for (const row of readDelimited(path, "\t")) {
      if (row.rtype !== "S" || row.studentgroup !== "ALL" || !cdsSet.has(row.cds)) continue;
      const ind = DashboardIndicator.parse({
        cds: row.cds,
        year: Number(row.reportingyear),
        indicator,
        level: colorCodeToLevel(row.color),
        status: numberOrNull(row.currstatus),
        change: numberOrNull(row.change),
        statusLevel: numberOrNull(row.statuslevel),
        changeLevel: numberOrNull(row.changelevel ?? row.changeLevel),
        denominator: numberOrNull(row.currdenom),
        nSizeMet: row.currnsizemet === "Y",
      });
      out.set(row.cds, [...(out.get(row.cds) ?? []), ind]);
      n += 1;
    }
    log(`  dashboard ${indicator}: ${n} rows from ${basename(path)}`);
  }
  return out;
}

const CAASPP_GRADES: Record<string, CaasppResult["grade"]> = {
  "13": "all",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "11": "11",
};

function loadCaaspp(cdsSet: Set<string>, districtSet: Set<string>) {
  const bySchool = new Map<string, CaasppResult[]>();
  const byDistrict = new Map<string, CaasppResult[]>();
  const state: CaasppResult[] = [];
  for (const row of readDelimited(need("caaspp"), "^")) {
    if (Number(row["Student Group ID"]) !== 1) continue;
    const subject = row["Test ID"] === "1" ? "ela" : row["Test ID"] === "2" ? "math" : undefined;
    const grade = CAASPP_GRADES[String(Number(row.Grade))];
    if (!subject || !grade) continue;
    const cds = cdsFromParts(row["County Code"], row["District Code"], row["School Code"]);
    const type = Number(row["Type ID"]);
    const isState = type === 4;
    const isDistrict = type === 6 && districtSet.has(cds);
    const isSchool = [7, 9, 10].includes(type) && cdsSet.has(cds);
    if (!isState && !isDistrict && !isSchool) continue;
    const result = CaasppResult.parse({
      cds,
      year: "2024-25",
      subject,
      grade,
      studentsTested: numberOrNull(row["Total Students Tested"]),
      meanScaleScore: numberOrNull(row["Mean Scale Score"]),
      pctExceeded: numberOrNull(row["Percentage Standard Exceeded"]),
      pctMet: numberOrNull(row["Percentage Standard Met"]),
      pctMetAndAbove: numberOrNull(row["Percentage Standard Met and Above"]),
      pctNearlyMet: numberOrNull(row["Percentage Standard Nearly Met"]),
      pctNotMet: numberOrNull(row["Percentage Standard Not Met"]),
    });
    if (isState) state.push(result);
    else if (isDistrict) byDistrict.set(cds, [...(byDistrict.get(cds) ?? []), result]);
    else bySchool.set(cds, [...(bySchool.get(cds) ?? []), result]);
  }
  log(
    `  caaspp: ${bySchool.size} schools, ${byDistrict.size} districts, ${state.length} state rows`,
  );
  return { bySchool, byDistrict, state };
}

const RACE: Record<string, RaceEthnicity> = {
  RE_B: "RB",
  RE_I: "RI",
  RE_A: "RA",
  RE_F: "RF",
  RE_H: "RH",
  RE_D: "RD",
  RE_P: "RP",
  RE_T: "RT",
  RE_W: "RW",
};
const GRADE_COLS: [string, Grade][] = [
  ["GR_TK", "TK"],
  ["GR_KN", "K"],
  ["GR_01", "1"],
  ["GR_02", "2"],
  ["GR_03", "3"],
  ["GR_04", "4"],
  ["GR_05", "5"],
  ["GR_06", "6"],
  ["GR_07", "7"],
  ["GR_08", "8"],
  ["GR_09", "9"],
  ["GR_10", "10"],
  ["GR_11", "11"],
  ["GR_12", "12"],
];

function loadEnrollment(cdsSet: Set<string>): Map<string, Enrollment> {
  const partial = new Map<
    string,
    {
      total?: number;
      byGrade: GradeCount[];
      race: Partial<Record<RaceEthnicity, number>>;
      el?: number;
      swd?: number;
      sed?: number;
      year: string;
    }
  >();
  for (const row of readDelimited(need("enrollment"), "\t")) {
    if (row.AggregateLevel !== "S") continue;
    const cds = cdsFromParts(row.CountyCode, row.DistrictCode, row.SchoolCode);
    if (!cdsSet.has(cds)) continue;
    const entry = partial.get(cds) ?? {
      byGrade: [],
      race: {},
      year: normalizeSchoolYear(row.AcademicYear),
    };
    const total = numberOrNull(row.TOTAL_ENR);
    const cat = row.ReportingCategory;
    if (cat === "TA") {
      entry.total = total ?? undefined;
      for (const [col, grade] of GRADE_COLS) {
        const count = numberOrNull(row[col]);
        if (count !== null && count > 0) entry.byGrade.push({ grade, count });
      }
    } else if (cat in RACE && total !== null) entry.race[RACE[cat]] = total;
    else if (cat === "SG_EL" && total !== null) entry.el = total;
    else if (cat === "SG_DS" && total !== null) entry.swd = total;
    else if (cat === "SG_SD" && total !== null) entry.sed = total;
    partial.set(cds, entry);
  }
  const out = new Map<string, Enrollment>();
  for (const [cds, e] of partial) {
    if (e.total === undefined) continue;
    out.set(
      cds,
      Enrollment.parse({
        cds,
        year: e.year,
        total: e.total,
        byGrade: e.byGrade,
        byRaceEthnicity: e.race,
        englishLearners: e.el,
        studentsWithDisabilities: e.swd,
        socioeconomicallyDisadvantaged: e.sed,
      }),
    );
  }
  log(`  enrollment: ${out.size} schools`);
  return out;
}

function loadStaff(cdsSet: Set<string>): Map<string, StaffRatio> {
  const out = new Map<string, StaffRatio>();
  for (const row of readDelimited(need("staff"), "\t")) {
    if (row["Aggregate Level"] !== "S") continue;
    const cds = cdsFromParts(row["County Code"], row["District Code"], row["School Code"]);
    if (!cdsSet.has(cds)) continue;
    const enrollment = numberOrNull(row.TOTAL_ENR_N);
    const fte = numberOrNull(row.TCH_FTE_N);
    if (enrollment === null || fte === null) continue;
    out.set(
      cds,
      StaffRatio.parse({
        cds,
        year: normalizeSchoolYear(row["Academic Year"]),
        enrollment,
        teacherFte: fte,
        studentTeacherRatio: numberOrNull(row.STU_TCH_RATIO),
      }),
    );
  }
  log(`  staff: ${out.size} schools`);
  return out;
}

function frpmFor(cds: string, frpmByCds: Map<string, Row>): Frpm | null {
  const row = frpmByCds.get(cds);
  if (!row) return null;
  const key = (name: string) => row[Object.keys(row).find((k) => k.startsWith(name)) ?? ""];
  const enrollment = numberOrNull(key("Enrollment (K-12)"));
  const free = numberOrNull(key("Free Meal Count (K-12)"));
  const frpm = numberOrNull(key("FRPM Count (K-12)"));
  if (enrollment === null || free === null || frpm === null || enrollment === 0) return null;
  return Frpm.parse({
    cds,
    year: normalizeSchoolYear(key("Academic Year")),
    enrollment,
    freeCount: free,
    frpmCount: frpm,
    pctFree: Math.min(1, free / enrollment),
    pctFrpm: Math.min(1, frpm / enrollment),
  });
}

// ---------------------------------------------------------------------------

async function main() {
  const { candidates, frpmByCds } = await loadPublicSchools();
  log(`Public schools within radius: ${candidates.length}`);
  const county = candidates[0]?.school.county ?? "Sacramento";

  // Keep a realistic mix: nearest ordinary schools first, then a few specialized ones so the toggle has something to show.
  const ordinary = candidates.filter(
    (c) => !c.school.educationalOption || ["TRAD", "ALTSOC"].includes(c.school.educationalOption),
  );
  const specialized = candidates.filter((c) => !ordinary.includes(c));
  const chosenPublic = [
    ...ordinary.slice(0, Math.max(0, maxPublic - 3)),
    ...specialized.slice(0, 3),
  ];

  const privates = (await loadPrivateSchools(county)).slice(0, maxPrivate);
  log(`Private schools chosen: ${privates.length}`);

  const cdsSet = new Set([
    ...chosenPublic.map((c) => c.school.cds),
    ...privates.map((p) => p.school.cds),
  ]);
  const districtSet = new Set(chosenPublic.map((c) => c.school.districtCds!).filter(Boolean));

  const dashboard = loadDashboard(cdsSet);
  const caaspp = loadCaaspp(cdsSet, districtSet);
  const enrollment = loadEnrollment(cdsSet);
  const staff = loadStaff(cdsSet);

  const records: SchoolRecord[] = [];
  for (const { school } of chosenPublic) {
    records.push(
      SchoolRecord.parse({
        school,
        dashboard: dashboard.get(school.cds) ?? [],
        caaspp: caaspp.bySchool.get(school.cds) ?? [],
        enrollment: enrollment.get(school.cds) ?? null,
        frpm: frpmFor(school.cds, frpmByCds),
        staff: staff.get(school.cds) ?? null,
        privateDetail: null,
      }),
    );
  }
  for (const { school, detail } of privates) {
    records.push(
      SchoolRecord.parse({
        school,
        dashboard: [],
        caaspp: [],
        enrollment: null,
        frpm: null,
        staff: null,
        privateDetail: detail,
      }),
    );
  }

  const file = {
    generatedAt: today,
    sources: [
      {
        name: "NCES CCD school directory 2024-25",
        url: "https://nces.ed.gov/ccd/Data/zip/ccd_sch_029_2425_w_1a_073025.zip",
        retrievedAt: today,
      },
      {
        name: "NCES EDGE public school geocodes 2024-25",
        url: "https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICSCH_2425.zip",
        retrievedAt: today,
      },
      {
        name: "CDE Public Schools and Districts directory (partial)",
        url: "https://www.cde.ca.gov/schooldirectory/report?rid=dl1&tp=txt",
        retrievedAt: today,
      },
      {
        name: "California School Dashboard 2025 research files",
        url: "https://www3.cde.ca.gov/researchfiles/cadashboard/",
        retrievedAt: today,
      },
      {
        name: "CAASPP 2024-25 statewide research file",
        url: "https://caaspp-elpac.ets.org/caaspp/researchfiles/sb_ca2025_1_csv_v1.zip",
        retrievedAt: today,
      },
      {
        name: "CDE FRPM 2024-25",
        url: "https://www.cde.ca.gov/ds/ad/documents/frpm2425.xlsx",
        retrievedAt: today,
      },
      {
        name: "CDE student/staff ratios 2023-24",
        url: "https://www3.cde.ca.gov/demo-downloads/staff/strat2324.txt",
        retrievedAt: today,
      },
      {
        name: "CDE Census Day enrollment 2024-25",
        url: "https://www3.cde.ca.gov/demo-downloads/census/cdenroll2425.txt",
        retrievedAt: today,
      },
      {
        name: "NCES Private School Survey 2023-24",
        url: "https://nces.ed.gov/surveys/pss/zip/pss2324_pu_csv.zip",
        retrievedAt: today,
      },
      {
        name: "CDE Private School Affidavit 2024-25",
        url: "https://www.cde.ca.gov/ds/si/ps/documents/privateschooldata2425.xlsx",
        retrievedAt: today,
      },
    ],
    stateCaaspp: caaspp.state,
    districtCaaspp: Object.fromEntries(caaspp.byDistrict),
    schools: records,
  };
  writeFileSync(String(args.out), JSON.stringify(file, null, 2) + "\n");
  log(`Wrote ${records.length} schools to ${args.out}`);
  for (const r of records) {
    const ela = r.dashboard.find((d) => d.indicator === "ela")?.level ?? "-";
    log(
      `  ${r.school.cds} ${r.school.type.padEnd(8)} ${r.school.name.padEnd(44)} ${r.school.educationalOption ?? "   "} ela=${ela} enr=${r.enrollment?.total ?? r.privateDetail?.totalEnrollment ?? "-"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
