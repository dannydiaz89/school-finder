import { useFormatter, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { caasppHistory, caasppYears } from "@/lib/domain/history";
import { indicatorKey } from "@/lib/labels";
import { CaasppSubject, type CaasppResult } from "@/lib/schemas";
import { percent } from "./format";

export interface TestsTrendProps {
  /** All-grades CAASPP results for the school, every year on file. */
  rows: CaasppResult[];
}

const HEADING_ID = "tests-history-heading";

/**
 * Share of students meeting or exceeding standard at this school, by
 * school year: one row per subject, one column per year. Renders nothing
 * for a school with one year.
 */
export function TestsTrend({ rows }: TestsTrendProps) {
  const t = useTranslations("school.history");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();

  const allGrades = rows.filter((row) => row.grade === "all");
  const years = caasppYears(allGrades);
  if (years.length < 2) return null;

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex flex-col gap-0.5">
        <h3 id={HEADING_ID} className="m-0 text-md font-medium text-fg">
          {t("heading")}
        </h3>
        <p className="m-0 text-sm text-fg-muted">{t("testsNote")}</p>
      </div>
      <Table minWidth={360} aria-labelledby={HEADING_ID}>
        <TableHead>
          <TableRow header>
            <TableHeaderCell>{t("subject")}</TableHeaderCell>
            {years.map((year) => (
              <TableHeaderCell key={year}>{year}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {CaasppSubject.options.map((subject) => {
            const history = caasppHistory(allGrades, subject);
            if (history.length === 0) return null;
            return (
              <TableRow key={subject}>
                <TableHeaderCell scope="row" className="text-fg">
                  {labels(indicatorKey(subject))}
                </TableHeaderCell>
                {years.map((year) => {
                  const value = history.find((r) => r.year === year)?.pctMetAndAbove ?? null;
                  return (
                    <TableCell key={year} muted={value === null}>
                      {value === null ? common("notTested") : percent(format, value / 100)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
