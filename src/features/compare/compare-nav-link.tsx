"use client";

import { useTranslations } from "next-intl";
import { TextLink } from "@/components/ui/text-link";
import { useCompareList } from "./use-compare-list";

/**
 * Header link to the compare page. Reads the list from the URL so it says
 * "Compare (3)" and carries the list along. `useSearchParams` is runtime
 * data: render inside a <Suspense> with the static link as the fallback.
 */
export function CompareNavLink({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { list, query } = useCompareList();
  return (
    <TextLink href={`/compare${query}`} className={className}>
      {list.length ? t("nav.compareWithCount", { count: list.length }) : t("nav.compare")}
    </TextLink>
  );
}
