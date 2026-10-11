import type { Address, SchoolYear } from "@/lib/schemas";

/**
 * External links the detail page offers. Each points at the public source
 * for the numbers shown, so a reader can check them. URL shapes verified
 * against the live sites on 2026-10-11.
 */

/** Dashboard report route is `/reports/:cdsCode/:year`, year being the Dashboard reporting year (2025). */
export function dashboardReportUrl(cds: string, year: number): string {
  return `https://www.caschooldashboard.org/reports/${cds}/${year}`;
}

/**
 * CAASPP school report. The site keys on county, district, and school parts
 * of the CDS code and on the test year, which is the second half of the
 * school year ("2024-25" is test year 2025).
 */
export function caasppReportUrl(cds: string, year: SchoolYear): string {
  const testYear = Number(year.slice(0, 4)) + 1;
  const params = new URLSearchParams({
    ps: "true",
    lstTestYear: String(testYear),
    lstTestType: "B",
    lstGroup: "1",
    lstSchoolType: "A",
    lstCounty: cds.slice(0, 2),
    lstDistrict: cds.slice(2, 7),
    lstSchool: cds.slice(7),
  });
  return `https://caaspp-elpac.ets.org/caaspp/DashViewReportSB?${params.toString()}`;
}

/** Google Maps directions to the school's published address. */
export function directionsUrl(address: Address): string {
  const destination = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Postal address as one line, in the order the source publishes it. */
export function addressLine(address: Address): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
}

/** "(916) 395-4790" -> "tel:+19163954790". Keeps whatever digits the directory has. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 10 ? `+1${digits}` : digits}`;
}

/**
 * ISO calendar date to a Date at noon UTC, so formatting in any US time zone
 * lands on the same calendar day.
 */
export function isoDateToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
