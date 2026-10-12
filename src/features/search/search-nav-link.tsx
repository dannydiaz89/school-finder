"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { IntentLink } from "@/components/ui/intent-link";
import { usePathname } from "@/i18n/navigation";
import {
  getLastSearchServerSnapshot,
  getLastSearchSnapshot,
  subscribeToLastSearch,
  writeLastSearch,
} from "./last-search";

/**
 * Header link to the search page. From any other page it leads back to the
 * last search this tab showed, results and filters included. On the search
 * page itself it is the plain link, which starts a new search.
 *
 * `useSearchParams` is runtime data: render inside a <Suspense> with the
 * static link as the fallback.
 */
export function SearchNavLink({ className }: { className?: string }) {
  const t = useTranslations("common");
  const onSearchPage = usePathname() === "/";
  const current = useSearchParams().toString();
  const last = useSyncExternalStore(
    subscribeToLastSearch,
    getLastSearchSnapshot,
    getLastSearchServerSnapshot,
  );

  // The search page's address is the search. Remember it whenever it is on screen,
  // including a blank one, so starting over is remembered too.
  useEffect(() => {
    if (onSearchPage) writeLastSearch(current);
  }, [onSearchPage, current]);

  const href = onSearchPage || !last ? "/" : `/?${last}`;
  return (
    <IntentLink href={href} className={className}>
      {t("nav.search")}
    </IntentLink>
  );
}
