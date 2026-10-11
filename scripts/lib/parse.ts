import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";

/**
 * Small, boring parsers for the delimited files California and NCES publish.
 * Each returns plain string records keyed by header; Zod row schemas do the
 * typing and coercion downstream.
 */

export type Row = Record<string, string>;

/**
 * Read a delimited text file into records. Pass `columns` for files that have
 * no header row (the NCES EDGE geocode files, for example).
 */
export function readDelimited(
  path: string,
  delimiter: "\t" | "," | "^" | "|",
  columns?: string[],
): Row[] {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return parse(text, {
    delimiter,
    columns: columns ?? ((header: string[]) => header.map((h) => h.replace(/\s+/g, " ").trim())),
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
    bom: true,
  }) as Row[];
}

/**
 * Read one sheet of an .xlsx where the header sits on `headerRow` (1-based)
 * and data follows. Cells are stringified; numbers keep full precision.
 */
export async function readSheet(
  path: string,
  sheetName: string,
  headerRow: number,
): Promise<Row[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found in ${path}`);
  const headers: string[] = [];
  sheet.getRow(headerRow).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  });
  const rows: Row[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const record: Row = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const header = headers[col];
      if (!header) return;
      const v = cell.value;
      record[header] =
        v === null || v === undefined
          ? ""
          : typeof v === "object" && "result" in v
            ? String(v.result ?? "")
            : typeof v === "object" && "text" in v
              ? String(v.text)
              : String(v);
    });
    rows.push(record);
  });
  return rows;
}

/** "278,927.1" -> 278927.1; "*" or "" -> null */
export function numberOrNull(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "*" || cleaned === "N/A" || cleaned === "No Data") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** CDE sometimes stores CDS codes as numbers and drops the leading zero. */
export function padCds(value: string | number): string {
  return String(value).replace(/\.0+$/, "").padStart(14, "0");
}

export function cdsFromParts(county: string, district: string, school: string): string {
  return county.padStart(2, "0") + district.padStart(5, "0") + school.padStart(7, "0");
}

/** "2024-2025" or "2024-25" -> "2024-25" */
export function normalizeSchoolYear(value: string): string {
  const m = /^(\d{4})-(\d{2})(\d{2})?$/.exec(value.trim());
  if (!m) return value.trim();
  return `${m[1]}-${m[3] ?? m[2]}`;
}

/** Column order of the NCES EDGE public school geocode TXT, which has no header row. */
export const EDGE_PUBLIC_COLUMNS = [
  "NCESSCH",
  "LEAID",
  "NAME",
  "OPSTFIPS",
  "STREET",
  "CITY",
  "STATE",
  "ZIP",
  "STFIP",
  "CNTY",
  "NMCNTY",
  "LOCALE",
  "LAT",
  "LON",
  "CBSA",
  "NMCBSA",
  "CBSATYPE",
  "CSA",
  "NMCSA",
  "CD",
  "SLDL",
  "SLDU",
  "SCHOOLYEAR",
];
