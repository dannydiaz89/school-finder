import { useTranslations } from "next-intl";
import { ExternalLink } from "@/components/ui/external-link";
import { LevelDot } from "@/components/ui/level-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { spanIncludes } from "@/lib/domain/grades";
import { statusUnit } from "@/lib/domain/history";
import { indicatorKey } from "@/lib/labels";
import { DASHBOARD_INDICATORS, type DashboardIndicator, type School } from "@/lib/schemas";
import { DashboardTrend } from "./dashboard-trend";
import { dashboardReportUrl } from "./links";
import { Section } from "./section";

export interface DashboardSectionProps {
  school: School;
  /** The newest year's rows. */
  rows: DashboardIndicator[];
  /** Every year on file, the newest included. Adds the by-year table when there are two or more. */
  history?: DashboardIndicator[];
}

/** Latest reporting year among the rows, or null when there are none. */
export function dashboardYear(rows: DashboardIndicator[]): number | null {
  return rows.length ? Math.max(...rows.map((r) => r.year)) : null;
}

/**
 * California School Dashboard section: one table row per published
 * indicator with the level as a dot plus word, the status in the
 * indicator's own unit, and the change from the prior year.
 */
export function DashboardSection({ school, rows, history = [] }: DashboardSectionProps) {
  const t = useTranslations("school");
  const common = useTranslations("common");
  const labels = useTranslations("labels");

  const year = dashboardYear(rows);
  const ordered = DASHBOARD_INDICATORS.map((id) => rows.find((r) => r.indicator === id)).filter(
    (r): r is DashboardIndicator => r !== undefined,
  );
  const span = school.gradesServed ?? school.gradesOffered;
  const hasHighSchoolRows = ordered.some(
    (r) => r.indicator === "graduation" || r.indicator === "collegeCareer",
  );
  const showNotApplicable = !hasHighSchoolRows && span !== undefined && !spanIncludes(span, "12");
  const anyWithoutLevel = ordered.some((r) => !r.nSizeMet);

  return (
    <Section
      id="dashboard"
      title={t("sections.dashboard")}
      note={year !== null ? t("sections.dashboardNote", { year }) : undefined}
    >
      {ordered.length === 0 ? (
        <p className="m-0 text-base text-fg-muted">{t("dashboard.empty")}</p>
      ) : (
        <Table minWidth={480}>
          <TableHead>
            <TableRow header>
              <TableHeaderCell>{t("dashboard.columns.indicator")}</TableHeaderCell>
              <TableHeaderCell>{t("dashboard.columns.level")}</TableHeaderCell>
              <TableHeaderCell>{t("dashboard.columns.status")}</TableHeaderCell>
              <TableHeaderCell>{t("dashboard.columns.change")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordered.map((row) => (
              <TableRow key={row.indicator}>
                <TableHeaderCell scope="row" className="text-fg">
                  {labels(indicatorKey(row.indicator))}
                </TableHeaderCell>
                <TableCell>
                  <LevelDot level={row.level} />
                </TableCell>
                <TableCell muted={row.status === null}>{statusText(t, common, row)}</TableCell>
                <TableCell muted={row.change === null}>{changeText(labels, common, row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {anyWithoutLevel ? (
        <p className="m-0 text-sm text-fg-muted">{t("dashboard.noLevel")}</p>
      ) : null}
      {showNotApplicable ? <p className="m-0 text-sm text-fg-muted">{t("notApplicable")}</p> : null}
      <DashboardTrend rows={history} />
      {year !== null ? (
        <p className="m-0 text-base">
          <ExternalLink href={dashboardReportUrl(school.cds, year)}>
            {t("dashboard.link")}
          </ExternalLink>
        </p>
      ) : null}
    </Section>
  );
}

/** Distance from standard in points, or a percent, depending on the indicator and year. */
function statusText(
  t: ReturnType<typeof useTranslations<"school">>,
  common: ReturnType<typeof useTranslations<"common">>,
  row: DashboardIndicator,
): string {
  if (row.status === null) return common("noData");
  const { indicator } = row;
  if (indicator === "ela" || indicator === "math" || statusUnit(indicator, row.year) === "points") {
    if (row.status > 0) return t("dashboard.status.distanceAbove", { points: row.status });
    if (row.status < 0) return t("dashboard.status.distanceBelow", { points: -row.status });
    return t("dashboard.status.distanceAt");
  }
  return t(`dashboard.status.${indicator}`, { value: row.status / 100 });
}

/**
 * "Increased 6.1", "Declined 3", or "Maintained". The Dashboard calls a
 * small change in either direction "Maintained" (change level 3); larger
 * ones are named by the sign of the change, whatever the indicator.
 */
function changeText(
  labels: ReturnType<typeof useTranslations<"labels">>,
  common: ReturnType<typeof useTranslations<"common">>,
  row: DashboardIndicator,
): string {
  if (row.change === null) return common("noData");
  if (row.changeLevel === 3 || row.change === 0) return labels("change.maintained");
  return row.change > 0
    ? labels("change.increased", { points: row.change })
    : labels("change.declined", { points: -row.change });
}
