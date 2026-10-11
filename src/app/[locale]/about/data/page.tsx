import { getTranslations } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";

/** Data sources page. Stage 0 placeholder; the Quality workstream replaces this file. */
export default async function DataPage({ params }: PageProps<"/[locale]/about/data">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "data" });

  return (
    <main className="flex flex-col gap-3 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <h1 className="text-3xl font-normal">{t("title")}</h1>
      <p className="text-base text-fg-secondary max-w-[652px]">{t("intro")}</p>
    </main>
  );
}
