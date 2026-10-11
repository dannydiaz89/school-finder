import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "./routing";

/**
 * Narrow the `[locale]` route param. Call at the top of every page and layout:
 *
 *   const locale = await requireLocale(params);
 *
 * Unknown locales 404. Also enables static rendering for the request.
 */
export async function requireLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
