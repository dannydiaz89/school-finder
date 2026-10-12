import { standardDistanceText } from "@/components/ui/standard-distance";
import { useFormatter, useTranslations } from "next-intl";
import { LevelDot } from "@/components/ui/level-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { SCIENCE_PERCENT_FROM_YEAR, dashboardYears, statusUnit } from "@/lib/domain/history";
import { indicatorKey } from "@/lib/labels";
import { DASHBOARD_INDICATORS, type DashboardIndicator } from "@/lib/schemas";

export interface DashboardTrendProps {
  /** Every Dashboard row on file for the school, all years. */
  rows: DashboardIndicator[];
}

const HEADING_ID = "dashboard-history-heading";

/**
 * The same indicators across the Dashboard years on file: one row per
 * indicator, one column per year, each cell the level as a dot plus word
 * with the status under it. Renders nothing for a school with one year.
 */
export function DashboardTrend({ rows }: DashboardTrendProps) {
  const t = useTranslations("school.history");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();

  const years = dashboardYears(rows);
  if (years.length < 2) return null;

  const indicators = DASHBOARD_INDICATORS.filter((id) => rows.some((r) => r.indicator === id));
  const cell = (indicator: DashboardIndicator["indicator"], year: number) =>
    rows.find((r) => r.indicator === indicator && r.year === year);

  const scienceYears = rows.filter((r) => r.indicator === "science").map((r) => r.year);
  const scienceChangedUnit =
    scienceYears.some((y) => y < SCIENCE_PERCENT_FROM_YEAR) &&
    scienceYears.some((y) => y >= SCIENCE_PERCENT_FROM_YEAR);
  // The newest year's missing levels are explained by the table above this one.
  const newest = years[years.length - 1];
  const earlierWithoutLevel = rows.some(
    (r) =>
      r.level === null && r.year < newest && !(r.indicator === "science" && scienceChangedUnit),
  );

  const statusText = (row: DashboardIndicator): string | null => {
    if (row.status === null) return null;
    return statusUnit(row.indicator, row.year) === "points"
      ? standardDistanceText(labels, row.status, "short")
      : format.number(row.status / 100, { style: "percent", maximumFractionDigits: 1 });
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex flex-col gap-0.5">
        <h3 id={HEADING_ID} className="m-0 text-md font-medium text-fg">
          {t("heading")}
        </h3>
        <p className="m-0 text-sm text-fg-muted">{t("dashboardNote")}</p>
      </div>
      <Table minWidth={480} aria-labelledby={HEADING_ID}>
        <TableHead>
          <TableRow header>
            <TableHeaderCell>{t("indicator")}</TableHeaderCell>
            {years.map((year) => (
              <TableHeaderCell key={year}>{year}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {indicators.map((indicator) => (
            <TableRow key={indicator}>
              <TableHeaderCell scope="row" className="text-fg">
                {labels(indicatorKey(indicator))}
              </TableHeaderCell>
              {years.map((year) => {
                const row = cell(indicator, year);
                if (row && row.level === null && row.status === null) {
                  // Suppressed for a small count: there is no result behind "No level".
                  return (
                    <TableCell key={year} muted>
                      {common("notReported")}
                    </TableCell>
                  );
                }
                if (!row) {
                  return (
                    <TableCell key={year} muted>
                      <span aria-hidden="true">{common("noData")}</span>
                      <span className="sr-only">{common("notReported")}</span>
                    </TableCell>
                  );
                }
                const status = statusText(row);
                return (
                  <TableCell key={year}>
                    <span className="flex flex-col gap-0.5">
                      <LevelDot level={row.level} />
                      {status ? <span className="text-sm text-fg-muted">{status}</span> : null}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {earlierWithoutLevel ? <p className="m-0 text-sm text-fg-muted">{t("noLevel")}</p> : null}
      {scienceChangedUnit ? (
        <p className="m-0 text-sm text-fg-muted">
          {t("science", { year: String(SCIENCE_PERCENT_FROM_YEAR) })}
        </p>
      ) : null}
    </div>
  );
}
