"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";

const THEMES = ["system", "light", "dark"] as const;
const subscribeNoop = () => () => {};
type Theme = (typeof THEMES)[number];

/**
 * A plain labelled <select>. It is the most accessible control for a three-way
 * choice and it matches the text-first look of the header.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("common.theme");
  const { theme, setTheme } = useTheme();
  const id = useId();
  // next-themes only knows the real theme after hydration; render "system" until then.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const value: Theme = mounted && THEMES.includes(theme as Theme) ? (theme as Theme) : "system";

  return (
    <label
      className={["inline-flex items-center gap-2 text-sm text-fg-muted", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{t("label")}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => setTheme(e.target.value)}
        className="h-8 rounded-sm border border-transparent bg-transparent text-fg hover:border-border px-1 cursor-pointer"
      >
        {THEMES.map((option) => (
          <option key={option} value={option}>
            {t(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
