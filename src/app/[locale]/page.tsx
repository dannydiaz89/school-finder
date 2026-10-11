import { getTranslations } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { Button } from "@/components/ui/button";

/**
 * Search page. Stage 0 placeholder: the Search workstream replaces this
 * file. It must keep the route, read URL state through
 * `parseSearchParams`, and fetch through `searchSchools` only.
 */
export default async function SearchPage({ params }: PageProps<"/[locale]">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "search" });

  return (
    <main className="flex flex-col gap-5 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <h1 className="text-3xl font-normal">{t("title")}</h1>
      <form className="flex max-w-[690px] items-center gap-3 rounded-full border border-border bg-bg px-4 h-[46px]">
        <label htmlFor="address" className="sr-only">
          {t("addressLabel")}
        </label>
        <input
          id="address"
          name="address"
          type="text"
          placeholder={t("addressPlaceholder")}
          className="flex-1 min-w-0 bg-transparent text-lg text-fg outline-none placeholder:text-fg-muted"
        />
        <span aria-hidden="true" className="h-6 w-px bg-border" />
        <span className="text-base whitespace-nowrap">{t("radius", { miles: 3 })}</span>
        <Button variant="text" type="submit">
          {t("submit")}
        </Button>
      </form>
      <p className="text-base text-fg-muted max-w-[652px]">{t("empty.body")}</p>
    </main>
  );
}
