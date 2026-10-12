import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MySchoolsView } from "@/features/my-schools/my-schools-view";
import { requireLocale } from "@/i18n/locale";
import { cachedGetSchoolBriefs } from "@/lib/data/cached";
import { parseMySchoolsParams } from "@/lib/schemas";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/my-schools">): Promise<Metadata> {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "mySchools" });
  // A personal list: nothing here for a search engine.
  return { title: t("heading"), robots: { index: false } };
}

/**
 * My schools. The list lives in the visitor's browser and rides in the
 * `schools` query parameter, so `searchParams` is runtime data: the part
 * that reads it sits inside a Suspense boundary and the shell around it is
 * prerendered.
 */
export default async function MySchoolsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/my-schools">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <main className="flex flex-col gap-5 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <Suspense fallback={<ListSkeleton label={t("loading")} />}>
        <MySchoolsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function MySchoolsContent({
  searchParams,
}: Pick<PageProps<"/[locale]/my-schools">, "searchParams">) {
  const { schools: cds } = parseMySchoolsParams(await searchParams);
  const schools = cds.length ? await cachedGetSchoolBriefs({ cds }) : [];
  return <MySchoolsView schools={schools} />;
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex max-w-[860px] flex-col gap-3">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-full max-w-[520px]" />
      <Skeleton lines={6} className="mt-4" />
    </div>
  );
}
