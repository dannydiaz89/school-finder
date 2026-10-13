import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TextLink } from "@/components/ui/text-link";
import type { Locale } from "@/i18n/routing";
import type { SearchParams } from "@/lib/schemas";
import { AddressForm } from "./address-form";
import { StartingPoints } from "./starting-points";

/**
 * The home screen, shown before any search: the name, the search box, and
 * a few ways to start, centered the way a search engine's front page is.
 * Once a search runs the page switches to the results layout with the box
 * at the top left.
 *
 * The large wordmark is the page's heading. Screen readers hear "Find a
 * school"; the letters themselves are decoration, like the header's.
 */
export async function HomeHero({ locale, params }: { locale: Locale; params: SearchParams }) {
  const t = await getTranslations({ locale, namespace: "search" });
  const common = await getTranslations({ locale, namespace: "common" });
  // Plain links: an example is searched when clicked, not when the pointer passes over it.
  const example = (text: string) => (
    <TextLink href={{ pathname: "/", query: { address: text } }}>{text}</TextLink>
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-7 pb-16 pt-[max(2rem,14vh)]">
      <h1 className="m-0 flex flex-col items-center gap-2 font-normal">
        <span className="sr-only">{t("title")}</span>
        <span
          aria-hidden="true"
          // The size is the display token, used here only.
          className="whitespace-nowrap text-[length:var(--text-display)] font-medium leading-none tracking-[-1px] text-fg"
        >
          <span className="text-accent">{common("appNameAccent")}</span>
          {common("appNameRest")}
        </span>
        <span aria-hidden="true" className="text-md leading-none tracking-[1px] text-fg-muted">
          {common("appNameRegion")}
        </span>
      </h1>
      <div className="w-full max-w-[690px]">
        <AddressForm locale={locale} params={params} className="mx-auto w-full" />
      </div>
      <Suspense fallback={<div className="min-h-6" />}>
        <StartingPoints />
      </Suspense>
      <p className="m-0 text-base text-fg-muted">
        {t.rich("home.try", {
          city: (chunks) => example(String(chunks)),
          zip: (chunks) => example(String(chunks)),
          school: (chunks) => example(String(chunks)),
        })}
      </p>
    </main>
  );
}
