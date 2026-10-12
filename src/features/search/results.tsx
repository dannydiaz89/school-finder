"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/dot";
import { ResultRow } from "@/components/ui/result-row";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeDot } from "@/components/ui/type-dot";
import { useCompareList } from "@/features/compare/use-compare-list";
import { useMySchools } from "@/features/my-schools/use-my-schools";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useStartNavigation } from "./pending";
import {
  SCHOOL_TYPES,
  serializeSearchParams,
  type CdsCode,
  type Coordinates,
  type SearchParams,
  type SearchResult,
} from "@/lib/schemas";

const MAP_BOX = "h-[220px] w-full rounded-lg sm:h-[320px] xl:h-[460px]";

const SearchMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <Skeleton className={MAP_BOX} />,
});

export interface SearchResultsProps {
  result: SearchResult;
  params: SearchParams;
  center: Coordinates;
  /** Server-rendered summary line and notes above the list. */
  header: ReactNode;
  /** Server-rendered "About these results" block under the list. */
  footer: ReactNode;
}

/** Index of the direct <li> child of `list` that contains `target`, or -1. */
function rowIndex(list: HTMLOListElement, target: EventTarget | null): number {
  let el = target instanceof Element ? target : null;
  while (el && el.parentElement !== list) el = el.parentElement;
  return el ? Array.prototype.indexOf.call(list.children, el) : -1;
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
  const listRef = useRef<HTMLOListElement>(null);
  const [hoveredCds, setHoveredCds] = useState<CdsCode | null>(null);

  const rows = result.schools;
  const cdsAt = (index: number) => rows[index]?.school.cds ?? null;

  const schoolHref = useCallback(
    (cds: CdsCode) => `/school/${cds}${compare.query}`,
    [compare.query],
  );

  /** A pin was clicked: open that school, as a click on a map pin does everywhere else. */
  const openFromMap = useCallback(
    (cds: CdsCode) => router.push(schoolHref(cds) as never),
    [router, schoolHref],
  );

  /** Pointing at a pin highlights its row and loads the school, so the click that may follow is instant. */
  const hoverFromMap = useCallback(
    (cds: CdsCode | null) => {
      setHoveredCds(cds);
      // "full" fetches the page content, not just its shell; the option is not in the public type.
      if (cds) router.prefetch(schoolHref(cds) as never, { kind: "full" } as never);
    },
    [router, schoolHref],
  );

  const pinTitle = useCallback(
    (number: number, name: string) => t("map.pin", { number, name }),
    [t],
  );

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
        <ol
          ref={listRef}
          className="m-0 list-none p-0"
          onMouseOver={(e) => setHoveredCds(cdsAt(rowIndex(e.currentTarget, e.target)))}
          onMouseLeave={() => setHoveredCds(null)}
          onFocus={(e) => setHoveredCds(cdsAt(rowIndex(e.currentTarget, e.target)))}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHoveredCds(null);
          }}
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

      <section
        role="region"
        aria-label={t("map.label")}
        className="order-first flex w-full min-w-0 flex-col gap-3 xl:order-none xl:sticky xl:top-5 xl:max-w-[var(--panel-width)] xl:flex-1"
      >
        <div className={`border border-border bg-bg-map ${MAP_BOX}`}>
          <SearchMap
            center={center}
            radiusMiles={params.radius}
            schools={rows}
            hoveredCds={hoveredCds}
            onHover={hoverFromMap}
            onSelect={openFromMap}
            pinTitle={pinTitle}
            homeTitle={params.loc ? t("map.center") : t("map.home")}
            detailsHref={schoolHref}
            className="h-full w-full"
          />
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-fg-secondary">
          {SCHOOL_TYPES.map((type) => (
            <li key={type}>
              <TypeDot type={type} className="text-sm" />
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <Dot size="sm" className="bg-fg" />
            {params.loc ? t("map.center") : t("map.home")}
          </li>
          <li>{t("map.radiusRing", { miles: params.radius })}</li>
        </ul>
      </section>
    </div>
  );
}
