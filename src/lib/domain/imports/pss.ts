import { School, type Affiliation } from "@/lib/schemas";
import type { PssRow } from "@/lib/schemas/imports/pss";
import type { AffidavitSchool } from "./affidavit";
import { titleCase } from "./common";

/**
 * Join the CDE Private School Affidavit (counts, CDS code) to the NCES
 * Private School Survey (address, coordinates, affiliation). Neither file
 * carries the other's key, so the join is by normalized name within the same
 * county, with a confidence score. Pure.
 */

const STOP_WORDS = new Set([
  "school",
  "schools",
  "elementary",
  "academy",
  "the",
  "of",
  "and",
  "inc",
  "catholic",
  "christian",
  "parish",
  "private",
  "preparatory",
  "prep",
  "k",
  "8",
  "12",
]);

/** Lowercase, "saint" -> "st", punctuation and generic words removed. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token))
    .join(" ");
}

/** Dice coefficient over name tokens, 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return (2 * shared) / (ta.size + tb.size);
}

/** County names in PSS are upper case, sometimes with " COUNTY". */
export function pssCounty(row: PssRow): string {
  return (row.PCNTNM ?? "")
    .replace(/\s+county$/i, "")
    .trim()
    .toLowerCase();
}

export function pssState(row: PssRow): string | undefined {
  return row.PL_STABB ?? row.PSTABB;
}

/** PSS typology: 1-3 Catholic, 4-6 other religious, 7-9 nonsectarian. */
export function typologyToAffiliation(typology: string | undefined): Affiliation | undefined {
  const n = Number(typology);
  if (n >= 1 && n <= 3) return "catholic";
  if (n >= 4 && n <= 6) return "otherReligious";
  if (n >= 7 && n <= 9) return "nonsectarian";
  return undefined;
}

export const MATCH_THRESHOLD = 0.8;
/** Two candidates this close in score are a tie and the row stays unmatched. */
export const AMBIGUITY_MARGIN = 0.05;

export type PssMatch =
  | {
      kind: "matched";
      affidavit: AffidavitSchool;
      pss: PssRow;
      confidence: number;
      via: "override" | "name";
    }
  | {
      kind: "unmatched";
      affidavit: AffidavitSchool;
      reason: "override" | "noCandidate" | "ambiguous" | "lowScore";
      best?: { pss: PssRow; score: number };
    };

/**
 * Match every affidavit school to at most one PSS row. Overrides (cds ->
 * pssId, or null to force no match) win. Otherwise the best-scoring PSS row
 * in the same county wins when its score clears the threshold and no runner
 * up is within the ambiguity margin. A PSS row is used at most once.
 */
export function matchPrivateSchools(
  affidavits: AffidavitSchool[],
  pssRows: PssRow[],
  overrides: Map<string, string | null>,
): PssMatch[] {
  const byPpin = new Map(pssRows.map((r) => [r.PPIN, r]));
  const byCounty = new Map<string, PssRow[]>();
  for (const row of pssRows) {
    const county = pssCounty(row);
    byCounty.set(county, [...(byCounty.get(county) ?? []), row]);
  }
  const taken = new Set<string>();
  const results: PssMatch[] = [];

  // Overrides and exact normalized-name matches first, so a weaker fuzzy match cannot steal a row.
  const pending: AffidavitSchool[] = [];
  for (const affidavit of affidavits) {
    if (overrides.has(affidavit.cds)) {
      const ppin = overrides.get(affidavit.cds);
      const pss = ppin ? byPpin.get(ppin) : undefined;
      if (ppin === null || !pss) {
        results.push({ kind: "unmatched", affidavit, reason: "override" });
      } else {
        taken.add(pss.PPIN);
        results.push({ kind: "matched", affidavit, pss, confidence: 1, via: "override" });
      }
      continue;
    }
    pending.push(affidavit);
  }

  const scored = pending.map((affidavit) => {
    const candidates = (byCounty.get(affidavit.county.toLowerCase()) ?? [])
      .map((pss) => ({ pss, score: nameSimilarity(affidavit.name, pss.PINST) }))
      .sort((a, b) => b.score - a.score);
    return { affidavit, candidates };
  });

  // Highest-confidence pairs claim their PSS row first.
  scored.sort((a, b) => (b.candidates[0]?.score ?? 0) - (a.candidates[0]?.score ?? 0));

  for (const { affidavit, candidates } of scored) {
    const open = candidates.filter((c) => !taken.has(c.pss.PPIN));
    const best = open[0];
    if (!best) {
      results.push({ kind: "unmatched", affidavit, reason: "noCandidate" });
      continue;
    }
    if (best.score < MATCH_THRESHOLD) {
      results.push({ kind: "unmatched", affidavit, reason: "lowScore", best });
      continue;
    }
    const runnerUp = open[1];
    if (runnerUp && best.score - runnerUp.score < AMBIGUITY_MARGIN && best.score < 1) {
      results.push({ kind: "unmatched", affidavit, reason: "ambiguous", best });
      continue;
    }
    taken.add(best.pss.PPIN);
    results.push({
      kind: "matched",
      affidavit,
      pss: best.pss,
      confidence: best.score,
      via: "name",
    });
  }
  return results;
}

/** Build the School row for a matched private school. Null when PSS lacks an address or coordinates. */
export function schoolFromPrivateMatch(affidavit: AffidavitSchool, pss: PssRow): School | null {
  const street = pss.PL_ADD ?? pss.PADDRS;
  const city = pss.PL_CIT ?? pss.PCITY;
  const zip = (pss.PL_ZIP ?? pss.PZIP ?? "").slice(0, 5);
  if (!street || !city || !/^\d{5}$/.test(zip)) return null;
  const coordinates =
    pss.LATITUDE24 !== null && pss.LONGITUDE24 !== null
      ? { latitude: pss.LATITUDE24, longitude: pss.LONGITUDE24 }
      : undefined;
  return School.parse({
    cds: affidavit.cds,
    name: affidavit.name,
    type: "private",
    district: affidavit.district,
    county: affidavit.county,
    address: { street, city: titleCase(city), zip, state: "CA" },
    phone: pss.PPHONE,
    coordinates,
    gradesOffered: affidavit.gradesOffered,
    affiliation: typologyToAffiliation(pss.TYPOLOGY),
    pssId: pss.PPIN,
  });
}
