"use client";

import { useTranslations } from "next-intl";
import { IntentLink } from "@/components/ui/intent-link";
import { useMySchools } from "./use-my-schools";

/**
 * Header link to My schools. Says "My schools (3)" and carries the list in
 * the address so the page can be rendered on the server. The count settles
 * after hydration, when the browser's list becomes readable.
 */
export function MySchoolsNavLink({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { list, href } = useMySchools();
  return (
    <IntentLink href={href} className={className}>
      {list.length ? t("nav.mySchoolsWithCount", { count: list.length }) : t("nav.mySchools")}
    </IntentLink>
  );
}
