"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/dot";
import { ResultRow } from "@/components/ui/result-row";
import { useCompareList } from "@/features/compare/use-compare-list";
import { useMySchools } from "@/features/my-schools/use-my-schools";
import { usePathname, useRouter } from "@/i18n/navigation";
import { MapPanel, useListHover } from "./map-panel";
import { useStartNavigation } from "./pending";
import {
  serializeSearchParams,
  type Coordinates,
  type SearchParams,
  type SearchResult,
} from "@/lib/schemas";

export interface SearchResultsProps {
  result: SearchResult;
  params: SearchParams;
  center: Coordinates;
  /** Server-rendered summary line and notes above the list. */
  header: ReactNode;
  /** Server-rendered "About these results" block under the list. */
  footer: ReactNode;
}

/**
 * The numbered results list and the map, side by side from `lg` and
 * stacked (map first) on phones. Hover or focus on a row highlights its
 * pin and the other way round. Compare toggles write the URL through
 * `useCompareList`, so this must render inside a Suspense boundary.
 */
export function SearchResults({ result, params, center, header, footer }: SearchResultsProps) {
  const t = useTranslations("search");
  const common = useTranslations("common");
  const compare = useCompareList();
  const mine = useMySchools();
  const router = useRouter();
  const startNavigation = useStartNavigation();
  const pathname = usePathname();
  const rows = result.schools;
  const { hoveredCds, setHoveredCds, listProps } = useListHover(rows);

  function showMore() {
    const query = serializeSearchParams({ ...params, page: params.page + 1 });
    if (compare.list.length) query.set("compare", compare.list.join(","));
    startNavigation(() => router.replace(`${pathname}?${query.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-10">
      <section
        aria-label={t("resultsLabel")}
        className="flex min-w-0 flex-col gap-3 xl:w-[var(--content-width)] xl:shrink-0"
      >
        {header}
        <ol className="m-0 list-none p-0" {...listProps}>
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
        {rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {result.total > rows.length ? (
              <Button variant="secondary" onClick={showMore}>
                {common("actions.showMore")}
              </Button>
            ) : null}
            <p className="m-0 text-sm text-fg-muted">
              {t("showingCount", { shown: rows.length, total: result.total })}
            </p>
          </div>
        ) : null}
        {footer}
      </section>

      <MapPanel
        rows={rows}
        hoveredCds={hoveredCds}
        onHover={setHoveredCds}
        center={center}
        radiusMiles={params.radius}
        homeTitle={params.loc ? t("map.center") : t("map.home")}
        legend={
          <>
            <li className="inline-flex items-center gap-1.5">
              <Dot size="sm" className="bg-fg" />
              {params.loc ? t("map.center") : t("map.home")}
            </li>
            <li>{t("map.radiusRing", { miles: params.radius })}</li>
          </>
        }
      />
    </div>
  );
}
