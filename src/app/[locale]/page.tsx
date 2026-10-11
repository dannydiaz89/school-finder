import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressForm } from "@/features/search/address-form";
import { SearchContent } from "@/features/search/search-content";
import { requireLocale } from "@/i18n/locale";
import { parseSearchParams } from "@/lib/schemas";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "search" });
  const common = await getTranslations({ locale, namespace: "common" });
  // The layout's title template applies only to child segments, not to this page, so join here.
  return {
    title: { absolute: common("join", { a: t("title"), b: common("appName") }) },
    description: t("intro"),
  };
}

/**
 * Search page. The heading is the static shell; the address form and the
 * results both read `searchParams`, which is runtime data under Cache
 * Components, so each sits in its own Suspense boundary with a skeleton.
 * The form boundary resolves at once (it only reads the URL); the results
 * boundary geocodes and searches.
 */
export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "search" });

  return (
    <main className="flex flex-col gap-5 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <h1 className="m-0 text-3xl font-normal">{t("title")}</h1>
      <Suspense fallback={<Skeleton className="h-12 max-w-[690px] rounded-full" />}>
        <FormWithParams locale={locale} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchContent locale={locale} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FormWithParams({
  locale,
  searchParams,
}: {
  locale: Awaited<ReturnType<typeof requireLocale>>;
  searchParams: PageProps<"/[locale]">["searchParams"];
}) {
  return <AddressForm locale={locale} params={parseSearchParams(await searchParams)} />;
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-11 max-w-[var(--content-width)]" />
      <Skeleton lines={8} className="max-w-[var(--content-width)]" />
    </div>
  );
}
