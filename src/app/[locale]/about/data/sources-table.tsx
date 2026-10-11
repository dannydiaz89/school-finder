import { getFormatter, getTranslations } from "next-intl/server";
import { ExternalLink } from "@/components/ui/external-link";
import type { Locale } from "@/i18n/routing";
import type { DataSourceEntry } from "./sources";
import type { SourceUpdates } from "./updates";

type Props = {
  locale: Locale;
  sources: DataSourceEntry[];
  updates: SourceUpdates;
};

const cell = "py-2.5 pr-4 align-top border-b border-hairline";
const head = `${cell} text-left text-sm font-medium text-fg-muted`;

/**
 * Hairline table of every data source: name (linked to the publisher's page),
 * publisher, what the app takes from it, how often it is refreshed, and when
 * it was last retrieved. Server component; renders at build time.
 */
export async function SourcesTable({ locale, sources, updates }: Props) {
  const t = await getTranslations({ locale, namespace: "data" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const format = await getFormatter({ locale });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">{t("table.caption")}</caption>
        <thead>
          <tr>
            <th scope="col" className={head}>
              {t("source")}
            </th>
            <th scope="col" className={head}>
              {t("table.publisher")}
            </th>
            <th scope="col" className={head}>
              {t("table.takes")}
            </th>
            <th scope="col" className={head}>
              {t("table.cadence")}
            </th>
            <th scope="col" className={`${head} pr-0`}>
              {t("table.updated")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => {
            const retrievedAt = source.fileUrl === null ? undefined : updates[source.fileUrl];
            return (
              <tr key={source.id}>
                <th scope="row" className={`${cell} font-normal whitespace-nowrap`}>
                  <ExternalLink href={source.landingUrl}>
                    {t(`sources.${source.id}.name`)}
                  </ExternalLink>
                </th>
                <td className={`${cell} text-fg-secondary`}>
                  {t(`publishers.${source.publisher}`)}
                </td>
                <td className={`${cell} min-w-[260px] text-fg-secondary`}>
                  {t(`sources.${source.id}.takes`)}
                </td>
                <td className={`${cell} whitespace-nowrap text-fg-secondary`}>
                  {t(`cadence.${source.cadence}`)}
                </td>
                <td className={`${cell} pr-0 whitespace-nowrap tabular-nums`}>
                  {retrievedAt === undefined ? (
                    <span className="text-fg-muted">{tc("noData")}</span>
                  ) : (
                    <time dateTime={retrievedAt}>
                      {format.dateTime(new Date(`${retrievedAt}T00:00:00Z`), {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      })}
                    </time>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
