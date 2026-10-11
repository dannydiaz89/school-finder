/**
 * Small conversions shared by the import transforms. Pure, no I/O.
 */

/** "1/15/2024" or "1/15/2024 12:00:00 AM" -> "2024-01-15". Undefined when it does not look like a date. */
export function usDateToIso(us: string | undefined): string | undefined {
  if (!us) return undefined;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(us.trim());
  if (!m) return undefined;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** Add a scheme when missing and drop values that are not a usable URL. */
export function normalizeWebsite(site: string | undefined): string | undefined {
  const text = (site ?? "").trim();
  if (!text) return undefined;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return /^https?:\/\/[^\s]+\.[^\s]+$/.test(withScheme) ? withScheme : undefined;
}

/** County (2) + district (5) + school (7) -> 14-digit CDS. */
export function cdsFromParts(county: string, district: string, school: string): string {
  return county.padStart(2, "0") + district.padStart(5, "0") + school.padStart(7, "0");
}

/** The district-level CDS for a school: school part zeroed. */
export function districtCdsOf(cds: string): string {
  return cds.slice(0, 7) + "0000000";
}

/** True for county office and district rows, whose school part is all zeros. */
export function isDistrictCds(cds: string): boolean {
  return cds.endsWith("0000000");
}

/** Test year 2025 -> "2024-25". */
export function schoolYearFromTestYear(testYear: number): string {
  return `${testYear - 1}-${String(testYear % 100).padStart(2, "0")}`;
}

/** "sacramento city unified" -> "Sacramento City Unified" */
export function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** Split an array into chunks of at most `size`. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
