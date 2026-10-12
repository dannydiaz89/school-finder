"use client";

import { useMemo } from "react";
import { ResultRow } from "@/components/ui/result-row";
import { useCompareList } from "@/features/compare/use-compare-list";
import type { NameMatch } from "@/lib/schemas";

/**
 * Schools found by name. The same rows as a radius search, without a
 * distance or a map: a name search has no center, and the matches can be
 * anywhere in the state.
 */
export function NameResults({ matches }: { matches: NameMatch[] }) {
  const compare = useCompareList();
  // ResultRow hides a distance that is not finite.
  const rows = useMemo(
    () => matches.map((match) => ({ ...match, distanceMeters: Number.POSITIVE_INFINITY })),
    [matches],
  );
  return (
    <ol className="m-0 max-w-[var(--content-width)] list-none p-0">
      {rows.map((summary, index) => (
        <ResultRow
          key={summary.school.cds}
          number={index + 1}
          summary={summary}
          href={`/school/${summary.school.cds}${compare.query}`}
          inCompare={compare.has(summary.school.cds)}
          onToggleCompare={compare.toggle}
          compareDisabled={compare.isFull}
        />
      ))}
    </ol>
  );
}
