"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LevelDot } from "@/components/ui/level-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { IntentLink } from "@/components/ui/intent-link";
import { TypeDot } from "@/components/ui/type-dot";
import { formatMiles } from "@/lib/domain/geo";
import { affiliationKey, gradeKey, indicatorKey, programKey, yesNoKey } from "@/lib/labels";
import type { CdsCode, Coordinates, SchoolDetail } from "@/lib/schemas";
import { bestInRow, distanceMeters, type ComparableRow } from "./best";
import {
  caasppYear,
  dashboardIndicator,
  dashboardIndicatorsPresent,
  dashboardYear,
  englishLearnerFraction,
  enrollmentTotal,
  frpmFraction,
  gradeSpan,
  hasTransitionalKindergarten,
  isSuppressed,
  isPointsIndicator,
  isPublic,
  programs,
  programsKnown,
  sharedYear,
  studentTeacherRatio,
  testScore,
} from "./facts";

export interface CompareTableProps {
  /** Schools in list order, at most MAX_COMPARE. */
  schools: readonly SchoolDetail[];
  /** Home coordinates from the URL; the distance row appears only when present. */
  home?: Coordinates;
  /** The city or ZIP code searched, when distances are from its center rather than a home address. */
  place?: string;
  /** Query string appended to school links so the list survives navigation, e.g. `?compare=a,b`. */
  query: string;
  onRemove: (cds: CdsCode) => void;
}

/** Row label column plus room for each school; below this the wrapper scrolls sideways. */
const LABEL_WIDTH = 230;
const COLUMN_WIDTH = 170;

/**
 * The compare table from the mockup: a header cell per school (name link,
 * type line, Remove), then grouped rows. Bold marks the best value where a
 * comparison is meaningful (see `best.ts`); private schools show "Not rated"
 * and "Not tested" in gray because they have no Dashboard or CAASPP rows.
 */
export function CompareTable({ schools, home, place, query, onRemove }: CompareTableProps) {
  const t = useTranslations("compare");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();

  const columns = schools.length + 1;
  const anyPublic = schools.some(isPublic);
  const indicators = dashboardIndicatorsPresent(schools);
  const dashYear = dashboardYear(schools);
  const testYear = caasppYear(schools);

  const percent = (fraction: number) =>
    format.number(fraction, { style: "percent", maximumFractionDigits: 0 });

  const best = (row: ComparableRow) => bestInRow(schools, row, home);

  /**
   * A row whose fact belongs to a school year. The year goes in the label
   * when every school shares it, and into each cell when they differ, so a
   * ratio from one year is never read against an enrollment from another.
   */
  const dated = (label: string, yearOf: (school: SchoolDetail) => string | null | undefined) => {
    const year = sharedYear(schools, yearOf);
    return {
      // The year never breaks across lines ("2024-" / "25").
      label: year
        ? t.rich("rows.withYear", {
            label,
            year,
            nowrap: (chunks) => <span className="whitespace-nowrap">{chunks}</span>,
          })
        : label,
      cell: (school: SchoolDetail, text: string) => {
        const own = yearOf(school);
        return !year && own ? common("join", { a: text, b: own }) : text;
      },
    };
  };
  const enrollmentRow = dated(
    t("rows.enrollment"),
    (s) => s.enrollment?.year ?? s.privateDetail?.year,
  );
  const ratioRow = dated(t("rows.studentTeacher"), (s) => s.staff?.year);
  const frpmRow = dated(t("rows.frpm"), (s) => s.frpm?.year);
  const learnersRow = dated(t("rows.englishLearners"), (s) => s.enrollment?.year);

  /** One data row. `cell` returns the content, or null for a muted "no data" dash. */
  const row = (
    key: string,
    label: ReactNode,
    cell: (school: SchoolDetail) => ReactNode | null,
    emphasized?: Set<CdsCode>,
    muted?: (school: SchoolDetail) => boolean,
  ) => (
    <TableRow key={key}>
      <TableHeaderCell scope="row">{label}</TableHeaderCell>
      {schools.map((school) => {
        const content = cell(school);
        const cds = school.school.cds;
        return (
          <TableCell
            key={cds}
            emphasis={emphasized?.has(cds)}
            emphasisLabel={t("best")}
            muted={content === null || muted?.(school)}
          >
            {content === null ? common("noData") : content}
          </TableCell>
        );
      })}
    </TableRow>
  );

  const typeLine = (school: SchoolDetail) => {
    const span = gradeSpan(school);
    const parts = [
      school.school.type === "private"
        ? school.school.affiliation
          ? labels(affiliationKey(school.school.affiliation))
          : null
        : school.school.district,
      span
        ? common("gradeSpan", {
            low: labels(gradeKey(span.low)),
            high: labels(gradeKey(span.high)),
          })
        : null,
    ].filter((p): p is string => Boolean(p));
    return parts.length ? parts.reduce((a, b) => common("join", { a, b })) : undefined;
  };

  return (
    <Table minWidth={LABEL_WIDTH + COLUMN_WIDTH * schools.length}>
      <caption className="sr-only">{t("title", { count: schools.length })}</caption>
      <TableHead>
        <TableRow header>
          {/* The corner is a plain cell: an empty header fails axe. */}
          <TableCell className="w-[230px]" />
          {schools.map((school) => (
            <TableHeaderCell key={school.school.cds} className="pb-3.5">
              <span className="flex flex-col items-start gap-1">
                <IntentLink
                  href={`/school/${school.school.cds}${query}`}
                  tone="link"
                  className="text-md leading-tight"
                >
                  {school.school.name}
                </IntentLink>
                <TypeDot
                  type={school.school.type}
                  detail={typeLine(school)}
                  // Pin the dot to the first line when the type line wraps in a narrow column.
                  className="text-sm text-fg-muted [&>span:first-child]:mt-[6px] [&>span:first-child]:self-start"
                />
                <Button
                  variant="text"
                  size="sm"
                  aria-label={t("removeSchool", { name: school.school.name })}
                  onClick={() => onRemove(school.school.cds)}
                >
                  {common("actions.remove")}
                </Button>
              </span>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        <TableGroupRow colSpan={columns}>{t("groups.location")}</TableGroupRow>
        {home
          ? row(
              "distance",
              place ? t("rows.distanceFrom", { place }) : t("rows.distance"),
              (school) => {
                const meters = distanceMeters(school, home);
                return meters === null ? null : common("miles", { count: formatMiles(meters) });
              },
              best({ kind: "distance" }),
            )
          : null}
        {row("grades", t("rows.grades"), (school) => {
          const span = gradeSpan(school);
          return span
            ? common("gradeSpan", {
                low: labels(gradeKey(span.low)),
                high: labels(gradeKey(span.high)),
              })
            : null;
        })}
        {row("tk", t("rows.tk"), (school) =>
          hasTransitionalKindergarten(school) ? labels(yesNoKey(true)) : null,
        )}

        {anyPublic && dashYear !== null ? (
          <>
            <TableGroupRow colSpan={columns}>
              {t("groups.dashboard", { year: dashYear })}{" "}
              <span className="text-sm font-normal text-fg-muted">{t("groups.dashboardNote")}</span>
            </TableGroupRow>
            {indicators.map((indicator) =>
              row(
                `dashboard-${indicator}`,
                labels(indicatorKey(indicator)),
                (school) => {
                  if (!isPublic(school)) return common("notRated");
                  const entry = dashboardIndicator(school, indicator);
                  if (!entry) return null;
                  if (isSuppressed(entry)) return common("notReported");
                  const status =
                    entry.status === null
                      ? null
                      : isPointsIndicator(indicator)
                        ? format.number(entry.status, {
                            signDisplay: "exceptZero",
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                        : format.number(entry.status / 100, {
                            style: "percent",
                            maximumFractionDigits: 1,
                          });
                  return (
                    <span className="inline-flex flex-wrap items-center gap-x-1.5">
                      <LevelDot level={entry.level} />
                      {status === null ? null : (
                        <span className="font-normal text-fg-muted">{status}</span>
                      )}
                    </span>
                  );
                },
                best({ kind: "dashboard", indicator }),
                (school) => {
                  const entry = dashboardIndicator(school, indicator);
                  return !isPublic(school) || (entry !== undefined && isSuppressed(entry));
                },
              ),
            )}
          </>
        ) : null}

        {anyPublic && testYear !== null ? (
          <>
            <TableGroupRow colSpan={columns}>
              {t("groups.tests", { year: testYear })}{" "}
              <span className="text-sm font-normal text-fg-muted">{t("groups.testsNote")}</span>
            </TableGroupRow>
            {(["ela", "math"] as const).map((subject) =>
              row(
                `test-${subject}`,
                labels(indicatorKey(subject)),
                (school) => {
                  if (!isPublic(school)) return common("notTested");
                  const score = testScore(school, subject);
                  return score === null ? null : percent(score / 100);
                },
                best({ kind: "test", subject }),
                (school) => !isPublic(school),
              ),
            )}
          </>
        ) : null}

        <TableGroupRow colSpan={columns}>{t("groups.students")}</TableGroupRow>
        {row("enrollment", enrollmentRow.label, (school) => {
          const total = enrollmentTotal(school);
          return total === null
            ? common("notReported")
            : enrollmentRow.cell(school, format.number(total));
        })}
        {row(
          "studentTeacher",
          ratioRow.label,
          (school) => {
            const ratio = studentTeacherRatio(school);
            return ratio === null
              ? common("notReported")
              : ratioRow.cell(school, common("ratio", { count: ratio }));
          },
          best({ kind: "studentTeacher" }),
          (school) => studentTeacherRatio(school) === null,
        )}
        {row(
          "frpm",
          frpmRow.label,
          (school) => {
            const fraction = frpmFraction(school);
            return fraction === null
              ? common("notReported")
              : frpmRow.cell(school, percent(fraction));
          },
          undefined,
          (school) => frpmFraction(school) === null,
        )}
        {row(
          "englishLearners",
          learnersRow.label,
          (school) => {
            const fraction = englishLearnerFraction(school);
            return fraction === null
              ? common("notReported")
              : learnersRow.cell(school, percent(fraction));
          },
          undefined,
          (school) => englishLearnerFraction(school) === null,
        )}
        {row(
          "programs",
          t("rows.programs"),
          (school) => {
            const list = programs(school);
            if (list.length) {
              return format.list(
                list.map((p) => labels(programKey(p))),
                { type: "unit" },
              );
            }
            // The directory reports the flags and none is set, which is different from no data.
            return programsKnown(school) ? t("noPrograms") : null;
          },
          undefined,
          (school) => !programsKnown(school),
        )}
      </TableBody>
    </Table>
  );
}
