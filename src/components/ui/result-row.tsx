"use client";

import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { formatMiles } from "@/lib/domain/geo";
import { affiliationKey, gradeKey } from "@/lib/labels";
import type { CdsCode, DashboardIndicatorId, SchoolSummary } from "@/lib/schemas";
import { Button } from "./button";
import { cx } from "./cx";
import { ExternalLink } from "./external-link";
import { LevelDot } from "./level-dot";
import { IntentLink } from "./intent-link";
import { TypeDot } from "./type-dot";

export interface ResultRowProps {
  /** 1-based position in the list; matches the map pin. */
  number: number;
  summary: SchoolSummary;
  /** Detail page link, e.g. `/school/${cds}`. */
  href: ComponentProps<typeof Link>["href"];
  inCompare: boolean;
  onToggleCompare: (cds: CdsCode) => void;
  /** Disable "Add to compare" when the list is full; "Remove" stays enabled. */
  compareDisabled?: boolean;
  /** Which Dashboard indicators to show as level dots, in order. Indicators without data are skipped. */
  indicators?: readonly DashboardIndicatorId[];
  /** Extra gray line under the meta text, e.g. why a hidden school is shown. */
  note?: ReactNode;
  className?: string;
}

const DEFAULT_INDICATORS: readonly DashboardIndicatorId[] = [
  "ela",
  "math",
  "chronicAbsenteeism",
  "suspension",
];

/**
 * One search result, as in the mockup: number badge and type line, the
 * school name as a link-blue title, a gray meta line, Dashboard levels as
 * dots with words, then text actions. Presentational: render inside an
 * <ol> and pass the compare callback down.
 */
export function ResultRow({
  number,
  summary,
  href,
  inCompare,
  onToggleCompare,
  compareDisabled,
  indicators = DEFAULT_INDICATORS,
  note,
  className,
}: ResultRowProps) {
  const t = useTranslations("common");
  const labels = useTranslations("labels");
  const { school, distanceMeters, dashboard, enrollment, studentTeacherRatio } = summary;
  const join = (parts: Array<string | null | undefined>) =>
    parts.filter((p): p is string => Boolean(p)).reduce((a, b) => t("join", { a, b }));

  const span = school.gradesServed ?? school.gradesOffered;
  const grades = span
    ? t("gradeSpan", { low: labels(gradeKey(span.low)), high: labels(gradeKey(span.high)) })
    : null;
  const context =
    school.type === "private"
      ? school.affiliation
        ? labels(affiliationKey(school.affiliation))
        : null
      : school.district;
  const distance = Number.isFinite(distanceMeters)
    ? t("miles", { count: formatMiles(distanceMeters) })
    : null;

  const meta = join([
    t("addressShort", { street: school.address.street, city: school.address.city }),
    enrollment === null ? null : t("students", { count: enrollment }),
    studentTeacherRatio === null ? null : t("studentTeacher", { count: studentTeacherRatio }),
  ]);

  const rated = indicators.filter((id) => dashboard[id]?.level);

  return (
    <li className={cx("flex flex-col gap-1.5 border-b border-hairline py-[18px]", className)}>
      <div className="flex items-center gap-2.5 text-base text-fg-secondary">
        <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-fg-on-accent">
          {number}
        </span>
        <TypeDot type={school.type} detail={join([context, grades, distance])} />
      </div>
      <IntentLink href={href} tone="link" className="w-fit text-2xl leading-tight">
        {school.name}
      </IntentLink>
      {meta ? <p className="m-0 text-base leading-relaxed text-fg-secondary">{meta}</p> : null}
      {note ? <p className="m-0 text-base text-fg-muted">{note}</p> : null}
      {rated.length > 0 ? (
        <ul className="m-0 mt-0.5 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0">
          {rated.map((id) => (
            <li key={id}>
              <LevelDot level={dashboard[id]?.level ?? null} indicator={id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-base text-fg-muted">{t("notRated")}</p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-base">
        <Button
          variant="text"
          aria-pressed={inCompare}
          disabled={compareDisabled && !inCompare}
          onClick={() => onToggleCompare(school.cds)}
        >
          {inCompare ? t("actions.inCompareList") : t("actions.addToCompare")}
        </Button>
        <IntentLink href={href}>{t("actions.details")}</IntentLink>
        {school.website ? (
          <ExternalLink href={school.website}>{t("actions.website")}</ExternalLink>
        ) : null}
      </div>
    </li>
  );
}
