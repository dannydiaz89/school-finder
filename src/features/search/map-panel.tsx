"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useCallback, useState, type HTMLAttributes, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeDot } from "@/components/ui/type-dot";
import { useCompareList } from "@/features/compare/use-compare-list";
import { useRouter } from "@/i18n/navigation";
import { SCHOOL_TYPES, type CdsCode, type Coordinates, type SchoolSummary } from "@/lib/schemas";

const MAP_BOX = "h-[220px] w-full rounded-lg sm:h-[320px] xl:h-[460px]";

const SearchMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <Skeleton className={MAP_BOX} />,
});

/** Index of the direct <li> child of `list` that contains `target`, or -1. */
function rowIndex(list: HTMLOListElement, target: EventTarget | null): number {
  let el = target instanceof Element ? target : null;
  while (el && el.parentElement !== list) el = el.parentElement;
  return el ? Array.prototype.indexOf.call(list.children, el) : -1;
}

/**
 * Which result is pointed at, shared by a results list and its map: hover or
 * focus on a row highlights its pin, and the other way round. Spread
 * `listProps` on the <ol> whose direct children are the rows.
 */
export function useListHover(rows: readonly { school: { cds: CdsCode } }[]) {
  const [hoveredCds, setHoveredCds] = useState<CdsCode | null>(null);
  const cdsAt = (index: number) => rows[index]?.school.cds ?? null;
  const listProps: HTMLAttributes<HTMLOListElement> = {
    onMouseOver: (e) => setHoveredCds(cdsAt(rowIndex(e.currentTarget, e.target))),
    onMouseLeave: () => setHoveredCds(null),
    onFocus: (e) => setHoveredCds(cdsAt(rowIndex(e.currentTarget, e.target))),
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setHoveredCds(null);
    },
  };
  return { hoveredCds, setHoveredCds, listProps };
}

export interface MapPanelProps {
  /** Rows in list order; the pin number is the index plus one. */
  rows: SchoolSummary[];
  hoveredCds: CdsCode | null;
  onHover: (cds: CdsCode | null) => void;
  /** The search circle, for a search around a place. Left out, the map frames the pins. */
  center?: Coordinates;
  radiusMiles?: number;
  homeTitle?: string;
  /** Extra legend entries after the school types, as <li> elements. */
  legend?: ReactNode;
}

/**
 * The map beside a results list, with its legend. A pin click opens that
 * school's page; pointing at a pin loads the page so the click is instant.
 * The list is the accessible path; the map offers nothing the list does not.
 *
 * Uses the compare hook, which reads the URL: render inside a <Suspense>.
 */
export function MapPanel({
  rows,
  hoveredCds,
  onHover,
  center,
  radiusMiles,
  homeTitle,
  legend,
}: MapPanelProps) {
  const t = useTranslations("search");
  const compare = useCompareList();
  const router = useRouter();

  const schoolHref = useCallback(
    (cds: CdsCode) => `/school/${cds}${compare.query}`,
    [compare.query],
  );
  const open = useCallback(
    (cds: CdsCode) => router.push(schoolHref(cds) as never),
    [router, schoolHref],
  );
  const hover = useCallback(
    (cds: CdsCode | null) => {
      onHover(cds);
      // "full" fetches the page content, not just its shell; the option is not in the public type.
      if (cds) router.prefetch(schoolHref(cds) as never, { kind: "full" } as never);
    },
    [onHover, router, schoolHref],
  );
  const pinTitle = useCallback(
    (number: number, name: string) => t("map.pin", { number, name }),
    [t],
  );

  return (
    <section
      role="region"
      aria-label={t("map.label")}
      className="order-first flex w-full min-w-0 flex-col gap-3 xl:order-none xl:sticky xl:top-5 xl:max-w-[var(--panel-width)] xl:flex-1"
    >
      <div className={`border border-border bg-bg-map ${MAP_BOX}`}>
        <SearchMap
          center={center}
          radiusMiles={radiusMiles}
          schools={rows}
          hoveredCds={hoveredCds}
          onHover={hover}
          onSelect={open}
          pinTitle={pinTitle}
          homeTitle={homeTitle}
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
        {legend}
      </ul>
    </section>
  );
}
