"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import type { Coordinates, SchoolDetail } from "@/lib/schemas";
import { CompareTable } from "./compare-table";
import { CopyLinkButton } from "./copy-link-button";
import { exceedsMax } from "./facts";
import { useCompareList } from "./use-compare-list";

export interface CompareViewProps {
  /** Every school named in the URL that the data source knows, in URL order. */
  schools: readonly SchoolDetail[];
  /** Home address and coordinates from the URL, when the user came from a search. */
  home: { address?: string; lat?: number; lng?: number };
}

/**
 * Everything below the page shell: heading, subtitle, actions, the table,
 * the notes, or the empty state.
 *
 * Remove and Clear all rewrite the URL through `useCompareList` (History
 * API, no navigation). The server fetched the full detail for every school
 * in the URL, so this component filters that list client-side by the
 * current `compare` parameter rather than asking the server to re-render:
 * the column disappears at once, nothing refetches, and the page stays a
 * plain server render on first load. A reload with the new URL fetches
 * only the schools still listed.
 */
export function CompareView({ schools, home }: CompareViewProps) {
  const t = useTranslations("compare");
  const common = useTranslations("common");
  const { list, remove, clear, max, query } = useCompareList();
  const searchParams = useSearchParams();

  const shown = useMemo(
    () =>
      list
        .map((cds) => schools.find((school) => school.school.cds === cds))
        .filter((school): school is SchoolDetail => school !== undefined),
    [list, schools],
  );
  const overflow = exceedsMax(searchParams.get("compare"));

  const coordinates: Coordinates | undefined =
    home.lat !== undefined && home.lng !== undefined
      ? { latitude: home.lat, longitude: home.lng }
      : undefined;

  if (shown.length === 0) {
    return (
      <>
        <h1 className="text-3xl font-normal">{t("heading")}</h1>
        <EmptyState
          title={t("emptyTitle")}
          body={t("empty", { max })}
          action={<TextLink href="/">{t("backToSearch")}</TextLink>}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-normal">{t("title", { count: shown.length })}</h1>
        <p className="text-base text-fg-muted">
          {home.address ? t("subtitle", { address: home.address }) : t("subtitleNoAddress")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
          <CopyLinkButton />
          <Button variant="text" size="sm" onClick={clear}>
            {common("actions.clearAll")}
          </Button>
        </div>
      </div>
      <CompareTable schools={shown} home={coordinates} query={query} onRemove={remove} />
      <div className="flex max-w-[860px] flex-col gap-2">
        {overflow ? <p className="text-sm text-fg-muted">{t("max", { max })}</p> : null}
        {shown.some((school) => school.school.type === "private") ? (
          <p className="text-sm text-fg-muted">{t("privateNote")}</p>
        ) : null}
      </div>
    </>
  );
}
