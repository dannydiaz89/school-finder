"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCompareList } from "@/features/compare/use-compare-list";
import type { CdsCode } from "@/lib/schemas";

/**
 * "Add to compare" / "In compare list" for the school on the page. The list
 * lives in the URL, so this must render inside a Suspense boundary.
 */
export function CompareToggle({ cds }: { cds: CdsCode }) {
  const t = useTranslations("common.actions");
  const compare = useCompareList();
  const inList = compare.has(cds);
  return (
    <Button
      variant="text"
      aria-pressed={inList}
      disabled={!inList && compare.isFull}
      onClick={() => compare.toggle(cds)}
    >
      {inList ? t("inCompareList") : t("addToCompare")}
    </Button>
  );
}
