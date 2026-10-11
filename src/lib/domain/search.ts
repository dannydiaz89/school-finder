import type { SchoolSummary, SearchArgs, SearchResult } from "@/lib/schemas";
import { countByType, isSpecializedPlacement, matchesFilters, sortRows } from "./filters";

/**
 * Turn the rows inside the radius into a SearchResult: hide placements,
 * apply filters, sort, count, page. Every backend calls this after it has
 * gathered the candidates, so results are identical whatever gathered them.
 */
export function assembleSearchResult(inRadius: SchoolSummary[], args: SearchArgs): SearchResult {
  const visible = inRadius.filter(
    (row) => args.filters.includeSpecialized || !isSpecializedPlacement(row.school),
  );
  const matched = sortRows(
    inRadius.filter((row) => matchesFilters(row, args.filters)),
    args.sort,
  );
  return {
    schools: matched.slice(args.offset, args.offset + args.limit),
    total: matched.length,
    countsByType: countByType(visible),
    hiddenSpecialized: inRadius.length - visible.length,
  };
}
