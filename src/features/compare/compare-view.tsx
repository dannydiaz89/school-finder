"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { parseCompareParams, type Coordinates, type SchoolDetail } from "@/lib/schemas";
import { CompareTable } from "./compare-table";
import { CopyLinkButton } from "./copy-link-button";
import { exceedsMax } from "./facts";
import { getCompareSnapshot, takeOpenedCompareLink } from "./store";
import { useCompareList } from "./use-compare-list";

export interface CompareViewProps {
  /** Every school named in the URL that the data source knows, in URL order. */
  schools: readonly SchoolDetail[];
  /** Home address and coordinates from the URL, when the user came from a search. */
  home: { address?: string; loc?: "city" | "zip"; lat?: number; lng?: number };
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
  const { list: stored, ready, remove, clear, set, max, query } = useCompareList();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlList = useMemo(() => parseCompareParams(searchParams).compare, [searchParams]);
  const hasUrlList = searchParams.has("compare");

  // A compare link opened directly (shared, bookmarked, reloaded) is the comparison to show,
  // so it becomes the list. Reaching the same address again with Back does not, or it would
  // undo whatever was added since.
  useLayoutEffect(() => {
    if (hasUrlList && takeOpenedCompareLink()) set(urlList);
    // Once, when the page first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Until the browser's list is readable (server render, hydration) the address is all there is.
  const list = ready ? stored : urlList;

  // Keep the address in step with the list, so Copy link and a reload give this comparison.
  // If the list holds a school this render has no data for, ask the server for it.
  useEffect(() => {
    const current = getCompareSnapshot();
    if (current.join(",") === urlList.join(",")) return;
    const params = new URLSearchParams(searchParams.toString());
    if (current.length) params.set("compare", current.join(","));
    else params.delete("compare");
    const qs = params.toString().replace(/%2C/g, ",");
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    const missing = current.some((cds) => !schools.some((school) => school.school.cds === cds));
    if (missing) router.replace(url as never, { scroll: false });
    else window.history.replaceState(null, "", url);
  }, [stored, urlList, schools, searchParams, router]);

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
      <CompareTable
        schools={shown}
        home={coordinates}
        place={home.loc ? home.address : undefined}
        query={query}
        onRemove={remove}
      />
      <div className="flex max-w-[860px] flex-col gap-2">
        {overflow ? <p className="text-sm text-fg-muted">{t("max", { max })}</p> : null}
        {shown.some((school) => school.school.type === "private") ? (
          <p className="text-sm text-fg-muted">{t("privateNote")}</p>
        ) : null}
      </div>
    </>
  );
}
