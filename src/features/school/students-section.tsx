import { useFormatter, useTranslations } from "next-intl";
import { Bar } from "@/components/ui/bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { gradeKey } from "@/lib/labels";
import { RaceEthnicity, type Enrollment, type PrivateSchoolDetail } from "@/lib/schemas";
import { joinParts, percent, share } from "./format";
import { Section } from "./section";

export interface StudentsSectionProps {
  enrollment: Enrollment | null;
  privateDetail: PrivateSchoolDetail | null;
}

/** Message key for a CDE race/ethnicity code under the `labels` namespace. */
const raceEthnicityKey = (code: RaceEthnicity) => `raceEthnicity.${code}` as const;

/**
 * Students section. Public schools: enrollment by race and ethnicity as
 * bars, largest first, then one line of student-group shares. Private
 * schools: enrollment by grade from the affidavit, as a small table.
 */
export function StudentsSection({ enrollment, privateDetail }: StudentsSectionProps) {
  const t = useTranslations("school");

  if (privateDetail) {
    return (
      <Section
        id="students"
        title={t("sections.students")}
        note={t("sections.affidavitNote", { year: privateDetail.year })}
      >
        <EnrollmentByGrade detail={privateDetail} />
      </Section>
    );
  }

  return (
    <Section
      id="students"
      title={t("sections.students")}
      note={enrollment ? t("sections.studentsNote", { year: enrollment.year }) : undefined}
    >
      {enrollment ? (
        <PublicEnrollment enrollment={enrollment} />
      ) : (
        <p className="m-0 text-base text-fg-muted">{t("students.empty")}</p>
      )}
    </Section>
  );
}

function PublicEnrollment({ enrollment }: { enrollment: Enrollment }) {
  const t = useTranslations("school");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();

  const groups = RaceEthnicity.options
    .map((code) => ({ code, count: enrollment.byRaceEthnicity[code] }))
    .filter((g): g is { code: RaceEthnicity; count: number } => g.count !== undefined)
    .sort((a, b) => b.count - a.count);

  const line = joinParts(common, [
    pct(enrollment.studentsWithDisabilities, enrollment.total, (value) =>
      t("students.disabilities", { value }),
    ),
    pct(enrollment.englishLearners, enrollment.total, (value) =>
      t("students.englishLearners", { value }),
    ),
    pct(enrollment.socioeconomicallyDisadvantaged, enrollment.total, (value) =>
      t("students.disadvantaged", { value }),
    ),
  ]);

  return (
    <>
      {groups.length > 0 ? (
        <div className="flex flex-col gap-2">
          {groups.map(({ code, count }) => {
            const fraction = share(count, enrollment.total) ?? 0;
            return (
              <Bar
                key={code}
                label={labels(raceEthnicityKey(code))}
                labelWidth="min(15rem, 55%)"
                value={fraction}
                max={1}
                valueLabel={percent(format, fraction)}
              />
            );
          })}
        </div>
      ) : null}
      {line ? <p className="m-0 text-base text-fg-secondary">{line}</p> : null}
    </>
  );
}

function pct(
  count: number | undefined,
  total: number,
  render: (value: number) => string,
): string | null {
  if (count === undefined) return null;
  const fraction = share(count, total);
  return fraction === null ? null : render(fraction);
}

function EnrollmentByGrade({ detail }: { detail: PrivateSchoolDetail }) {
  const t = useTranslations("school");
  const labels = useTranslations("labels");
  const format = useFormatter();
  return (
    <Table className="max-w-[20rem]">
      <TableHead>
        <TableRow header>
          <TableHeaderCell>{t("students.grade")}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t("students.count")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {detail.enrollmentByGrade.map(({ grade, count }) => (
          <TableRow key={grade}>
            <TableHeaderCell scope="row">{labels(gradeKey(grade))}</TableHeaderCell>
            <TableCell className="text-right tabular-nums">{format.number(count)}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableHeaderCell scope="row" className="text-fg">
            {t("students.total")}
          </TableHeaderCell>
          <TableCell emphasis className="text-right tabular-nums">
            {format.number(detail.totalEnrollment)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
