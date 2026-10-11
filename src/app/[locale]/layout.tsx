import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Google_Sans_Flex } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { requireLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import "../globals.css";

const sans = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  // Next has no metric overrides for this font yet; skip the synthetic fallback rather than warn.
  adjustFontFallback: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: {
      default: t("appName"),
      template: `%s · ${t("appName")}`,
    },
    description: t("appName"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} suppressHydrationWarning className={`${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-bg focus:px-3 focus:py-2 focus:text-accent"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <Providers>
            <SiteHeader />
            <div id="main" className="flex flex-1 flex-col">
              {children}
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
