"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CdsCode } from "@/lib/schemas";
import { useMySchools } from "./use-my-schools";

/** "Add to My schools" / "In My schools" for one school. Settles after hydration. */
export function MySchoolsToggle({ cds }: { cds: CdsCode }) {
  const t = useTranslations("common.actions");
  const mine = useMySchools();
  const inList = mine.has(cds);
  return (
    <Button
      variant="text"
      aria-pressed={inList}
      disabled={!inList && mine.isFull}
      onClick={() => mine.toggle(cds)}
    >
      {inList ? t("inMySchools") : t("addToMySchools")}
    </Button>
  );
}
