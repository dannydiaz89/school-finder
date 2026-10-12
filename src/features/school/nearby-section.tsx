"use client";

import { useTranslations } from "next-intl";
import { ResultRow } from "@/components/ui/result-row";
import { IntentLink } from "@/components/ui/intent-link";
import { useCompareList } from "@/features/compare/use-compare-list";
import { useMySchools } from "@/features/my-schools/use-my-schools";
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
 * Client component: the compare list is read from and written to the browser's store.
 */
export function NearbySection({ cds, nearby, query }: NearbySectionProps) {
  const t = useTranslations("school");
  const compare = useCompareList();
  const mine = useMySchools();

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
                inMySchools={mine.has(row.school.cds)}
                onToggleMySchools={mine.toggle}
                mySchoolsDisabled={mine.isFull}
              />
            ))}
          </ol>
          <p className="m-0 text-base">
            <IntentLink
              href={{ pathname: "/compare", query: { ...query, compare: all.join(",") } }}
              // This link names a specific comparison, so it becomes the list.
              onClick={() => compare.set(all)}
            >
              {t("nearby.compare", { count: all.length - 1 })}
            </IntentLink>
          </p>
        </>
      )}
    </Section>
  );
}
