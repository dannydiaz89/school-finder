"use client";

import { useTranslations } from "next-intl";
import { ResultRow } from "@/components/ui/result-row";
import { TextLink } from "@/components/ui/text-link";
import { useCompareList } from "@/features/compare/use-compare-list";
import { MAX_COMPARE, type CdsCode, type SchoolSummary } from "@/lib/schemas";
import { Section } from "./section";

export interface NearbySectionProps {
  /** The school on the page; first in the "compare" link. */
  cds: CdsCode;
  /** Nearest other schools, distances measured from this school. */
  nearby: SchoolSummary[];
  /** Search state (address, lat, lng, filters) to carry into every link. */
  query: Record<string, string>;
}

/**
 * Nearby alternatives as the same rows the search page uses, numbered,
 * with a link that opens this school and the nearest few in Compare.
 * Client component: the compare list is read from and written to the URL.
 */
export function NearbySection({ cds, nearby, query }: NearbySectionProps) {
  const t = useTranslations("school");
  const compare = useCompareList();

  const withCompare = compare.list.length ? { ...query, compare: compare.list.join(",") } : query;
  const params = new URLSearchParams(withCompare).toString();
  const search = params ? `?${params}` : "";
  const all = [cds, ...nearby.map((row) => row.school.cds)].slice(0, MAX_COMPARE);

  return (
    <Section
      id="nearby"
      title={t("sections.nearby")}
      note={nearby.length ? t("sections.nearbyNote") : undefined}
      className="border-b-0"
    >
      {nearby.length === 0 ? (
        <p className="m-0 text-base text-fg-muted">{t("nearby.empty")}</p>
      ) : (
        <>
          <ol className="m-0 list-none p-0">
            {nearby.map((row, index) => (
              <ResultRow
                key={row.school.cds}
                number={index + 1}
                summary={row}
                href={`/school/${row.school.cds}${search}`}
                inCompare={compare.has(row.school.cds)}
                onToggleCompare={compare.toggle}
                compareDisabled={compare.isFull}
              />
            ))}
          </ol>
          <p className="m-0 text-base">
            <TextLink href={{ pathname: "/compare", query: { ...query, compare: all.join(",") } }}>
              {t("nearby.compare", { count: all.length - 1 })}
            </TextLink>
          </p>
        </>
      )}
    </Section>
  );
}
