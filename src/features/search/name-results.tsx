"use client";

import { useMemo } from "react";
import { ResultRow } from "@/components/ui/result-row";
import { useCompareList } from "@/features/compare/use-compare-list";
import { useMySchools } from "@/features/my-schools/use-my-schools";
import type { NameMatch } from "@/lib/schemas";
import { MapPanel, useListHover } from "./map-panel";

/**
 * Schools found by name: the same rows as a search around a place, without a
 * distance, since a name search has no center. The map frames the matches
 * wherever they are, which for a common name is most of the state, and has
 * no search circle or home marker.
 */
export function NameResults({ matches }: { matches: NameMatch[] }) {
  const compare = useCompareList();
  const mine = useMySchools();
  // ResultRow hides a distance that is not finite.
  const rows = useMemo(
    () => matches.map((match) => ({ ...match, distanceMeters: Number.POSITIVE_INFINITY })),
    [matches],
  );
  const { hoveredCds, setHoveredCds, listProps } = useListHover(rows);
  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-10">
      <ol
        className="m-0 min-w-0 list-none p-0 xl:w-[var(--content-width)] xl:shrink-0"
        {...listProps}
      >
        {rows.map((summary, index) => (
          <ResultRow
            key={summary.school.cds}
            number={index + 1}
            summary={summary}
            href={`/school/${summary.school.cds}${compare.query}`}
            inCompare={compare.has(summary.school.cds)}
            onToggleCompare={compare.toggle}
            compareDisabled={compare.isFull}
            inMySchools={mine.has(summary.school.cds)}
            onToggleMySchools={mine.toggle}
            mySchoolsDisabled={mine.isFull}
            className={[
              "-mx-3 rounded-sm px-3",
              hoveredCds === summary.school.cds ? "bg-bg-subtle" : "",
            ].join(" ")}
          />
        ))}
      </ol>
      <MapPanel rows={rows} hoveredCds={hoveredCds} onHover={setHoveredCds} />
    </div>
  );
}
