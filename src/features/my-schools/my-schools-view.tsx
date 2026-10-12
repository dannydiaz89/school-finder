"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { parseMySchoolsParams, type SchoolBrief } from "@/lib/schemas";
import { MySchoolsTable, newestDashboardYear } from "./my-schools-table";
import { browserSavedSchools } from "./store";
import { useMySchools } from "./use-my-schools";

export interface MySchoolsViewProps {
  /** Every school named in the address that the data source knows. */
  schools: readonly SchoolBrief[];
}

/**
 * Everything below the page shell: heading, the note about where the list
 * is kept, the table, or the empty state.
 *
 * The list is the browser's; the address only carries it to the server so
 * the rows can be loaded there. This component keeps the two in step: when
 * the list names a school this render has no data for, it asks the server
 * for the list as it is now; otherwise it just corrects the address.
 * Removing a school filters the rows already here, so it is instant.
 *
 * With accounts the server would know the list itself, and the address
 * would stop carrying it. Nothing below the hook would change.
 */
export function MySchoolsView({ schools }: MySchoolsViewProps) {
  const t = useTranslations("mySchools");
  const common = useTranslations("common");
  const { list: stored, ready, remove, removeMany, max } = useMySchools();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlList = useMemo(() => parseMySchoolsParams(searchParams).schools, [searchParams]);

  // Until the browser's list is readable (server render, hydration) the address is all there is.
  const list = ready ? stored : urlList;
  const inStep = stored.join(",") === urlList.join(",");

  useEffect(() => {
    const current = browserSavedSchools.getSnapshot().map((entry) => entry.cds);
    if (current.join(",") === urlList.join(",")) return;
    // The address as it should read, keeping the locale prefix it already has.
    const url = `${window.location.pathname}${current.length ? `?schools=${current.join(",")}` : ""}`;
    const missing = current.some((cds) => !schools.some((s) => s.school.cds === cds));
    if (missing) router.replace(url as never, { scroll: false });
    else window.history.replaceState(null, "", url);
  }, [stored, urlList, schools, router]);

  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base" }), []);
  const shown = useMemo(
    () =>
      list
        .map((cds) => schools.find((s) => s.school.cds === cds))
        .filter((s): s is SchoolBrief => s !== undefined)
        .sort((a, b) => collator.compare(a.school.name, b.school.name)),
    [list, schools, collator],
  );

  // Codes the server was asked for and does not know: closed schools, or a list from old data.
  const unknown =
    ready && inStep ? list.filter((cds) => !shown.some((s) => s.school.cds === cds)) : [];
  // Rows are on their way: the list is not readable yet, or the server has not answered for it.
  const loading = ready ? !inStep && shown.length < list.length : urlList.length === 0;

  const heading = <h1 className="text-3xl font-normal">{t("heading")}</h1>;

  if (loading && shown.length === 0) {
    return (
      <>
        {heading}
        <div role="status" className="flex max-w-[860px] flex-col gap-3">
          <span className="sr-only">{common("loading")}</span>
          <Skeleton className="h-4 w-full max-w-[520px]" />
          <Skeleton lines={6} className="mt-4" />
        </div>
      </>
    );
  }

  if (list.length === 0) {
    return (
      <>
        {heading}
        <EmptyState
          title={t("emptyTitle")}
          body={t("empty", { max })}
          action={<TextLink href="/">{t("find")}</TextLink>}
        />
        <p className="max-w-[860px] text-sm text-fg-muted">{t("storageNote")}</p>
      </>
    );
  }

  const year = newestDashboardYear(shown);
  return (
    <>
      <div className="flex flex-col gap-1.5">
        {heading}
        <p className="text-base text-fg-muted">
          {year === null
            ? t("count", { count: shown.length })
            : t("subtitle", { count: shown.length, year })}
        </p>
      </div>
      {shown.length > 0 ? <MySchoolsTable schools={shown} onRemove={remove} /> : null}
      <div className="flex max-w-[860px] flex-col gap-2">
        {unknown.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            {t("missing", { count: unknown.length })}
            <Button variant="text" size="sm" onClick={() => removeMany(unknown)}>
              {t("removeMissing")}
            </Button>
          </p>
        ) : null}
        {stored.length >= max ? (
          <p className="text-sm text-fg-muted">{t("full", { max })}</p>
        ) : null}
        <p className="text-sm text-fg-muted">{t("storageNote")}</p>
      </div>
    </>
  );
}
