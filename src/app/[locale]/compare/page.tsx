import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompareView } from "@/features/compare/compare-view";
import { requireLocale } from "@/i18n/locale";
import { cachedGetSchoolsByCds } from "@/lib/data/cached";
import { parseCompareParams } from "@/lib/schemas";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "compare" });
  return { title: t("heading"), description: t("subtitleNoAddress") };
}

/**
 * Compare page. The list of schools is the `compare` query parameter, so
 * `searchParams` is runtime data: the part that reads it sits inside a
 * Suspense boundary with a skeleton table, and the shell around it is
 * prerendered.
 */
export default async function ComparePage({
  params,
  searchParams,
}: PageProps<"/[locale]/compare">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <main className="flex flex-col gap-5 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <Suspense fallback={<CompareSkeleton label={t("loading")} />}>
        <CompareContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CompareContent({
  searchParams,
}: Pick<PageProps<"/[locale]/compare">, "searchParams">) {
  const p = parseCompareParams(await searchParams);
  // The shared cached wrapper, so an import's cache clear reaches this page too.
  const schools = p.compare.length ? await cachedGetSchoolsByCds({ cds: p.compare }) : [];
  return (
    <CompareView
      schools={schools}
      home={{ address: p.address, loc: p.loc, lat: p.lat, lng: p.lng }}
    />
  );
}

function CompareSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex max-w-[860px] flex-col gap-3">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-full max-w-[520px]" />
      <Skeleton lines={8} className="mt-4" />
    </div>
  );
}
