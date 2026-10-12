import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { StatRow, type Stat } from "@/components/ui/stat-row";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import type { SchoolDetail } from "@/lib/schemas";
import { percent, share } from "./format";

/**
 * The Overview section: up to four big numbers. Public schools show
 * enrollment, student–teacher ratio, free/reduced meals, and English
 * learners; private schools show enrollment and teacher counts from the
 * affidavit. Private schools also get the one neutral line about ratings.
 */
export function SchoolStats({ detail }: { detail: SchoolDetail }) {
  const t = useTranslations("school");
  const common = useTranslations("common");
  const format = useFormatter();
  const stats = statsFor(detail, t, common, format);

  return (
    <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-4">
      <VisuallyHidden as="h2" id="overview-heading">
        {t("sections.overview")}
      </VisuallyHidden>
      {stats.length > 0 ? <StatRow stats={stats} /> : null}
      {detail.school.type === "private" ? (
        <p className="m-0 border-b border-hairline py-3 text-base text-fg-muted">
          {t("private.notRated")}
        </p>
      ) : null}
    </section>
  );
}

/** Keeps a school year on one line: "2024-25" never breaks after the hyphen. */
const nowrap = (chunks: ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;

function statsFor(
  detail: SchoolDetail,
  t: ReturnType<typeof useTranslations<"school">>,
  common: ReturnType<typeof useTranslations<"common">>,
  format: ReturnType<typeof useFormatter>,
): Stat[] {
  const stats: Stat[] = [];
  const { enrollment, frpm, staff, privateDetail } = detail;

  if (privateDetail) {
    stats.push({
      key: "enrollment",
      value: format.number(privateDetail.totalEnrollment),
      label: t.rich("stats.enrollment", { year: privateDetail.year, nowrap }),
    });
    stats.push({
      key: "fullTime",
      value: format.number(privateDetail.fullTimeTeachers),
      label: t("stats.fullTimeTeachers"),
    });
    stats.push({
      key: "partTime",
      value: format.number(privateDetail.partTimeTeachers),
      label: t("stats.partTimeTeachers"),
    });
    return stats;
  }

  if (enrollment) {
    stats.push({
      key: "enrollment",
      value: format.number(enrollment.total),
      label: t.rich("stats.enrollment", { year: enrollment.year, nowrap }),
    });
  }
  if (staff?.studentTeacherRatio !== null && staff?.studentTeacherRatio !== undefined) {
    stats.push({
      key: "ratio",
      value: common("ratio", { count: staff.studentTeacherRatio }),
      label: t.rich("stats.studentTeacher", { year: staff.year, nowrap }),
    });
  }
  if (frpm) {
    stats.push({
      key: "frpm",
      value: percent(format, frpm.pctFrpm),
      label: t.rich("stats.frpm", { year: frpm.year, nowrap }),
    });
  }
  const el =
    enrollment?.englishLearners !== undefined
      ? share(enrollment.englishLearners, enrollment.total)
      : null;
  if (enrollment && el !== null) {
    stats.push({
      key: "el",
      value: percent(format, el),
      label: t.rich("stats.englishLearners", { year: enrollment.year, nowrap }),
    });
  }
  return stats;
}
