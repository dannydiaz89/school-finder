import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";
import { TextLink } from "./ui/text-link";

/**
 * Top bar: wordmark, primary links, language and theme controls.
 * The address search field lives in the page, not here, so each page decides
 * whether to show it.
 */
export function SiteHeader() {
  const t = useTranslations("common");
  return (
    <header className="flex flex-wrap items-center gap-x-7 gap-y-3 px-7 pt-4">
      <Link
        href="/"
        className="flex items-baseline text-2xl font-medium tracking-[-0.3px] text-fg no-underline hover:no-underline whitespace-nowrap"
      >
        <span className="text-accent">{t("appNameAccent")}</span>
        {t("appNameRest")}
      </Link>
      <nav aria-label={t("appName")} className="flex items-center gap-5 text-sm">
        <TextLink href="/">{t("nav.search")}</TextLink>
        <TextLink href="/compare">{t("nav.compare")}</TextLink>
        <TextLink href="/about/data">{t("nav.data")}</TextLink>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        {/* Reads route params, which are runtime data on dynamic routes under Cache Components. */}
        <Suspense fallback={null}>
          <LocaleSwitch />
        </Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
