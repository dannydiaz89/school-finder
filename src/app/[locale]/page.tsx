import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressForm } from "@/features/search/address-form";
import { HomeHero } from "@/features/search/home-hero";
import { SearchContent } from "@/features/search/search-content";
import { requireLocale } from "@/i18n/locale";
import { isBlankSearch, parseSearchParams } from "@/lib/schemas";

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
 * The search page. With nothing searched it is the home screen (`HomeHero`);
 * with a search it is the results layout. Which one depends on
 * `searchParams`, which is runtime data under Cache Components, so the whole
 * body sits in a Suspense boundary. That boundary resolves at once, since
 * choosing a layout only reads the URL; the results inside have their own
 * boundary, which geocodes and searches.
 */
export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]">) {
  const locale = await requireLocale(params);
  return (
    // An empty landmark for the instant before the layout is known, so neither layout flashes.
    <Suspense fallback={<main className="flex-1" aria-busy="true" />}>
      <SearchBody locale={locale} searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchBody({
  locale,
  searchParams,
}: {
  locale: Awaited<ReturnType<typeof requireLocale>>;
  searchParams: PageProps<"/[locale]">["searchParams"];
}) {
  const p = parseSearchParams(await searchParams);
  if (isBlankSearch(p)) return <HomeHero locale={locale} params={p} />;

  const t = await getTranslations({ locale, namespace: "search" });
  return (
    <main className="flex flex-col gap-5 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <h1 className="m-0 text-3xl font-normal">{t("title")}</h1>
      <AddressForm locale={locale} params={p} />
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchContent locale={locale} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-11 max-w-[var(--content-width)]" />
      <Skeleton lines={8} className="max-w-[var(--content-width)]" />
    </div>
  );
}
