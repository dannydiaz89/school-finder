"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { TextLink } from "@/components/ui/text-link";
import { useCompareList } from "@/features/compare/use-compare-list";
import { useMySchools } from "@/features/my-schools/use-my-schools";
import { parseSearchParams } from "@/lib/schemas";
import { getRecentSearchSnapshot, subscribeToLastSearch } from "./last-search";

/** The recent search as a link label: "Downey, CA · within 3 mi", or just the text for a name search. */
function useRecentSearch() {
  const t = useTranslations("search");
  const query = useSyncExternalStore(subscribeToLastSearch, getRecentSearchSnapshot, () => "");
  if (!query) return null;
  const p = parseSearchParams(new URLSearchParams(query));
  if (!p.address) return null;
  const located = p.lat !== undefined && p.lng !== undefined;
  return {
    href: `/?${query}`,
    label: located
      ? t("home.place", { place: p.address, radius: t("radius", { miles: p.radius }) })
      : p.address,
  };
}

/**
 * Links under the home screen's search box that pick up where the visitor
 * left off: their last search, My schools, and the compare list. Each
 * appears only when there is something behind it, so a first visit shows
 * none. Everything here comes from what the browser remembers; the home
 * screen reads nothing from the backend.
 *
 * Uses the compare hook, which reads the URL: render inside a <Suspense>.
 */
export function StartingPoints() {
  const t = useTranslations("search");
  const common = useTranslations("common");
  const recent = useRecentSearch();
  const mine = useMySchools();
  const compare = useCompareList();

  const hasAny = recent !== null || mine.list.length > 0 || compare.list.length > 0;
  return (
    // The height is reserved so the line below does not jump when these appear after hydration.
    <nav aria-label={t("home.label")} className="min-h-6 text-base">
      {hasAny ? (
        <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-1 p-0">
          {recent ? (
            <li>
              <span className="text-fg-muted">{t("home.lastSearch")}</span>{" "}
              <TextLink href={recent.href}>{recent.label}</TextLink>
            </li>
          ) : null}
          {mine.list.length > 0 ? (
            <li>
              <TextLink href={mine.href}>
                {common("nav.mySchoolsWithCount", { count: mine.list.length })}
              </TextLink>
            </li>
          ) : null}
          {compare.list.length > 0 ? (
            <li>
              <TextLink href={`/compare${compare.query}`}>
                {common("nav.compareWithCount", { count: compare.list.length })}
              </TextLink>
            </li>
          ) : null}
        </ul>
      ) : null}
    </nav>
  );
}
