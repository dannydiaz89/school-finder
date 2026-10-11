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
import { TextLink } from "@/components/ui/text-link";
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
  isPointsIndicator,
  isPublic,
  programs,
  studentTeacherRatio,
  testScore,
} from "./facts";

export interface CompareTableProps {
  /** Schools in list order, at most MAX_COMPARE. */
  schools: readonly SchoolDetail[];
  /** Home coordinates from the URL; the distance row appears only when present. */
  home?: Coordinates;
  /** Query string appended to school links so the list survives navigation, e.g. `?compare=a,b`. */
  query: string;
  onRemove: (cds: CdsCode) => void;
}

/** Row label column plus room for each school; below this the wrapper scrolls sideways. */
const LABEL_WIDTH = 190;
const COLUMN_WIDTH = 170;

/**
 * The compare table from the mockup: a header cell per school (name link,
 * type line, Remove), then grouped rows. Bold marks the best value where a
 * comparison is meaningful (see `best.ts`); private schools show "Not rated"
 * and "Not tested" in gray because they have no Dashboard or CAASPP rows.
 */
export function CompareTable({ schools, home, query, onRemove }: CompareTableProps) {
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

  /** One data row. `cell` returns the content, or null for a muted "no data" dash. */
  const row = (
    key: string,
    label: string,
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
          <TableCell className="w-[190px]" />
          {schools.map((school) => (
            <TableHeaderCell key={school.school.cds} className="pb-3.5">
              <span className="flex flex-col items-start gap-1">
                <TextLink
                  href={`/school/${school.school.cds}${query}`}
                  tone="link"
                  className="text-md leading-tight"
                >
                  {school.school.name}
                </TextLink>
                <TypeDot
                  type={school.school.type}
                  detail={typeLine(school)}
                  className="text-sm text-fg-muted"
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
              t("rows.distance"),
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
              {t("groups.dashboard", { year: dashYear })}
            </TableGroupRow>
            {indicators.map((indicator) =>
              row(
                `dashboard-${indicator}`,
                labels(indicatorKey(indicator)),
                (school) => {
                  if (!isPublic(school)) return common("notRated");
                  const entry = dashboardIndicator(school, indicator);
                  if (!entry) return null;
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
                (school) => !isPublic(school),
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
        {row("enrollment", t("rows.enrollment"), (school) => {
          const total = enrollmentTotal(school);
          return total === null ? common("notReported") : format.number(total);
        })}
        {row(
          "studentTeacher",
          t("rows.studentTeacher"),
          (school) => {
            const ratio = studentTeacherRatio(school);
            return ratio === null ? common("notReported") : common("ratio", { count: ratio });
          },
          best({ kind: "studentTeacher" }),
          (school) => studentTeacherRatio(school) === null,
        )}
        {row(
          "frpm",
          t("rows.frpm"),
          (school) => {
            const fraction = frpmFraction(school);
            return fraction === null ? common("notReported") : percent(fraction);
          },
          undefined,
          (school) => frpmFraction(school) === null,
        )}
        {row(
          "englishLearners",
          t("rows.englishLearners"),
          (school) => {
            const fraction = englishLearnerFraction(school);
            return fraction === null ? common("notReported") : percent(fraction);
          },
          undefined,
          (school) => englishLearnerFraction(school) === null,
        )}
        {row("programs", t("rows.programs"), (school) => {
          const list = programs(school);
          return list.length
            ? format.list(
                list.map((p) => labels(programKey(p))),
                { type: "unit" },
              )
            : null;
        })}
        {row("magnet", t("rows.magnet"), (school) =>
          school.school.magnet === undefined ? null : labels(yesNoKey(school.school.magnet)),
        )}
      </TableBody>
    </Table>
  );
}
