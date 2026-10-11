import type {
  EducationalOption,
  School,
  SchoolSummary,
  SearchFilters,
  SortKey,
} from "@/lib/schemas";
import { spanOverlapsBand } from "./grades";
import { levelRank, meetsMinLevel } from "./levels";

/**
 * Pure filtering and sorting over search rows. The data layer gathers
 * candidates within the radius; this module decides which ones show.
 * No I/O, no backend types.
 */

/** Public schools that are ordinary choices. Everything else is a placement and hidden by default. */
export const ORDINARY_OPTIONS: ReadonlySet<EducationalOption> = new Set(["TRAD", "ALTSOC"]);

export function isSpecializedPlacement(school: School): boolean {
  if (school.type === "private") return false;
  // Adult schools and preschool-only programs are not K-12 choices. CDE codes many
  // preschool programs as elementary level, so the offered grade span is the reliable signal.
  if (school.instructionLevel === "A" || school.instructionLevel === "PS") return true;
  if (school.gradesOffered?.high === "P") return true;
  if (school.educationalOption && !ORDINARY_OPTIONS.has(school.educationalOption)) return true;
  return false;
}

export function matchesType(school: School, filters: SearchFilters): boolean {
  return filters.types.includes(school.type);
}

export function matchesGradeBands(school: School, filters: SearchFilters): boolean {
  if (filters.gradeBands.length === 0) return true;
  const span = school.gradesServed ?? school.gradesOffered;
  if (!span) return false;
  return filters.gradeBands.some((band) => spanOverlapsBand(span, band));
}

export function matchesPrograms(school: School, filters: SearchFilters): boolean {
  if (filters.programs.length === 0) return true;
  return filters.programs.some((program) => {
    switch (program) {
      case "magnet":
        return school.magnet === true;
      case "multilingual":
        return school.multilingual === true;
      case "virtual":
        return school.virtual === "F" || school.virtual === "V";
    }
  });
}

export function matchesAffiliation(school: School, filters: SearchFilters): boolean {
  if (filters.affiliations.length === 0) return true;
  if (school.type !== "private") return true;
  return school.affiliation !== undefined && filters.affiliations.includes(school.affiliation);
}

export function matchesRating(row: SchoolSummary, filters: SearchFilters): boolean {
  if (!filters.minElaLevel) return true;
  return meetsMinLevel(row.dashboard.ela?.level, filters.minElaLevel);
}

export function matchesSize(row: SchoolSummary, filters: SearchFilters): boolean {
  if (filters.maxEnrollment === null) return true;
  return row.enrollment !== null && row.enrollment <= filters.maxEnrollment;
}

export function matchesFilters(row: SchoolSummary, filters: SearchFilters): boolean {
  const s = row.school;
  if (!filters.includeSpecialized && isSpecializedPlacement(s)) return false;
  return (
    matchesType(s, filters) &&
    matchesGradeBands(s, filters) &&
    matchesPrograms(s, filters) &&
    matchesAffiliation(s, filters) &&
    matchesRating(row, filters) &&
    matchesSize(row, filters)
  );
}

/** Stable sort. Ties and missing values fall back to distance so results never jump around. */
export function sortRows(rows: SchoolSummary[], sort: SortKey): SchoolSummary[] {
  const byDistance = (a: SchoolSummary, b: SchoolSummary) => a.distanceMeters - b.distanceMeters;
  const desc = (get: (r: SchoolSummary) => number) => (a: SchoolSummary, b: SchoolSummary) =>
    get(b) - get(a) || byDistance(a, b);
  switch (sort) {
    case "distance":
      return [...rows].sort(byDistance);
    case "ela":
      return [...rows].sort(desc((r) => levelRank(r.dashboard.ela?.level)));
    case "math":
      return [...rows].sort(desc((r) => levelRank(r.dashboard.math?.level)));
    case "enrollment":
      return [...rows].sort(desc((r) => r.enrollment ?? -1));
  }
}

export function countByType(rows: SchoolSummary[]) {
  const counts = { district: 0, charter: 0, private: 0 };
  for (const r of rows) counts[r.school.type] += 1;
  return counts;
}
