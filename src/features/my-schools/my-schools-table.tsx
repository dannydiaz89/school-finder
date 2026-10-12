"use client";

import { standardDistanceText } from "@/components/ui/standard-distance";
import { gradeSpanText } from "@/components/ui/grade-span";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { IntentLink } from "@/components/ui/intent-link";
import { LevelDot } from "@/components/ui/level-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { TypeDot } from "@/components/ui/type-dot";
import { changeKind } from "@/lib/domain/bands";
import { statusUnit } from "@/lib/domain/history";
import { affiliationKey, indicatorKey } from "@/lib/labels";
import type { CdsCode, DashboardIndicatorId, SchoolBrief } from "@/lib/schemas";

export interface MySchoolsTableProps {
  /** Schools to list, already in display order. */
  schools: readonly SchoolBrief[];
  onRemove: (cds: CdsCode) => void;
}

/** The indicators every public school has. Graduation joins when a listed school reports it. */
const CORE: readonly DashboardIndicatorId[] = ["ela", "math", "chronicAbsenteeism", "suspension"];

const SCHOOL_WIDTH = 250;
const INDICATOR_WIDTH = 150;
const STUDENTS_WIDTH = 90;

/** Indicator columns for a list: the core four, plus graduation when any school has it. */
export function indicatorColumns(schools: readonly SchoolBrief[]): DashboardIndicatorId[] {
  return schools.some((s) => s.dashboard.graduation) ? [...CORE, "graduation"] : [...CORE];
}

/** Newest Dashboard year among the schools, or null when none is rated. */
export function newestDashboardYear(schools: readonly SchoolBrief[]): number | null {
  const years = schools.map((s) => s.dashboard.year).filter((y): y is number => y !== null);
  return years.length ? Math.max(...years) : null;
}

/**
 * The My schools table: one row per school, one column per Dashboard
 * indicator. Each cell gives the color level, the result behind it, and how
 * it moved from the year before, which is what someone following a set of
 * schools looks for first.
 */
export function MySchoolsTable({ schools, onRemove }: MySchoolsTableProps) {
  const t = useTranslations("mySchools");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();

  const indicators = indicatorColumns(schools);
  const join = (parts: Array<string | null | undefined>) => {
    const present = parts.filter((p): p is string => Boolean(p));
    return present.length ? present.reduce((a, b) => common("join", { a, b })) : undefined;
  };

  const typeLine = (brief: SchoolBrief) => {
    const { school } = brief;
    const span = school.gradesServed ?? school.gradesOffered;
    return join([
      school.type === "private"
        ? school.affiliation
          ? labels(affiliationKey(school.affiliation))
          : null
        : school.district,
      span ? gradeSpanText(common, labels, span) : null,
      school.address.city,
    ]);
  };

  const indicatorCell = (brief: SchoolBrief, indicator: DashboardIndicatorId) => {
    const key = `${brief.school.cds}-${indicator}`;
    if (brief.school.type === "private") {
      return (
        <TableCell key={key} muted>
          {common("notRated")}
        </TableCell>
      );
    }
    const entry = brief.dashboard[indicator];
    const year = brief.dashboard.year;
    if (!entry || year === null) {
      return (
        <TableCell key={key} muted>
          <span aria-hidden="true">{common("noData")}</span>
          <span className="sr-only">{common("notReported")}</span>
        </TableCell>
      );
    }
    // Suppressed for a small count: there is no result behind "No level".
    if (entry.level === null && entry.status === null) {
      return (
        <TableCell key={key} muted>
          {common("notReported")}
        </TableCell>
      );
    }
    const status =
      entry.status === null
        ? null
        : statusUnit(indicator, year) === "points"
          ? standardDistanceText(labels, entry.status)
          : format.number(entry.status / 100, { style: "percent", maximumFractionDigits: 1 });
    const kind = changeKind(indicator, year, entry.change);
    const change =
      kind === null
        ? null
        : // Named with the year it is measured from, so it cannot be read as the result itself.
          t(`change.${kind}`, { points: Math.abs(entry.change ?? 0), year: String(year - 1) });
    return (
      <TableCell key={key}>
        <span className="flex flex-col gap-0.5">
          <LevelDot level={entry.level} />
          {status ? <span className="text-sm text-fg-secondary">{status}</span> : null}
          {change ? <span className="text-sm text-fg-muted">{change}</span> : null}
        </span>
      </TableCell>
    );
  };

  return (
    <Table minWidth={SCHOOL_WIDTH + INDICATOR_WIDTH * indicators.length + STUDENTS_WIDTH}>
      <caption className="sr-only">{t("heading")}</caption>
      <TableHead>
        <TableRow header>
          <TableHeaderCell style={{ width: SCHOOL_WIDTH }}>{t("columns.school")}</TableHeaderCell>
          {indicators.map((indicator) => (
            <TableHeaderCell key={indicator}>{labels(indicatorKey(indicator))}</TableHeaderCell>
          ))}
          <TableHeaderCell style={{ width: STUDENTS_WIDTH }}>
            {t("columns.students")}
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {schools.map((brief) => (
          <TableRow key={brief.school.cds}>
            <TableHeaderCell scope="row" className="text-fg">
              <span className="flex flex-col items-start gap-1">
                <IntentLink
                  href={`/school/${brief.school.cds}`}
                  tone="link"
                  className="text-md leading-tight"
                >
                  {brief.school.name}
                </IntentLink>
                <TypeDot
                  type={brief.school.type}
                  detail={typeLine(brief)}
                  // Pin the dot to the first line when the type line wraps.
                  className="text-sm text-fg-muted [&>span:first-child]:mt-[6px] [&>span:first-child]:self-start"
                />
                <Button
                  variant="text"
                  size="sm"
                  aria-label={t("remove", { name: brief.school.name })}
                  onClick={() => onRemove(brief.school.cds)}
                >
                  {common("actions.remove")}
                </Button>
              </span>
            </TableHeaderCell>
            {indicators.map((indicator) => indicatorCell(brief, indicator))}
            <TableCell muted={brief.enrollment === null}>
              {brief.enrollment === null ? common("notReported") : format.number(brief.enrollment)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
