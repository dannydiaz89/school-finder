import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { DATA_SOURCES } from "./sources";
import { SourcesTable } from "./sources-table";
import { getSourceUpdates } from "./updates";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about/data">): Promise<Metadata> {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "data" });
  return { title: t("title"), description: t("intro") };
}

/**
 * Data sources page: every public file the app reads, what it takes from
 * each, how often it refreshes, and when it was last retrieved. Reads no
 * request data, so it prerenders at build time.
 */
export default async function DataPage({ params }: PageProps<"/[locale]/about/data">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "data" });
  const updates = await getSourceUpdates();

  return (
    <main className="flex flex-col gap-5 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-normal">{t("title")}</h1>
        <p className="text-base text-fg-secondary max-w-[652px]">{t("intro")}</p>
        <p className="text-sm text-fg-muted max-w-[652px]">{t("updatedNote")}</p>
      </div>
      <SourcesTable locale={locale} sources={DATA_SOURCES} updates={updates} />
    </main>
  );
}
