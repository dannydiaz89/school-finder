"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useId, useTransition } from "react";
import { locales } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Switches the locale while keeping the current path and query string.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations("common.locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const id = useId();
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={["inline-flex items-center gap-2 text-sm text-fg-muted", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{t("label")}</span>
      <select
        id={id}
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as (typeof locales)[number];
          startTransition(() => {
            // @ts-expect-error pathname and params come from the current route and match a known route.
            router.replace({ pathname, params }, { locale: next });
          });
        }}
        className="h-8 rounded-sm border border-transparent bg-transparent text-fg hover:border-border px-1 cursor-pointer"
      >
        {locales.map((option) => (
          <option key={option} value={option}>
            {t(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
