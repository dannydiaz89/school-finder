import { getTranslations } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";

/** Compare page. Stage 0 placeholder; the Compare workstream replaces this file. */
export default async function ComparePage({ params }: PageProps<"/[locale]/compare">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "compare" });

  return (
    <main className="flex flex-col gap-3 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <h1 className="text-3xl font-normal">{t("title", { count: 0 })}</h1>
      <p className="text-base text-fg-muted">{t("empty")}</p>
    </main>
  );
}
