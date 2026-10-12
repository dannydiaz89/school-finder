"use client";

import { gradeSpanText } from "@/components/ui/grade-span";
import { useTranslations } from "next-intl";
import { IntentLink } from "@/components/ui/intent-link";
import { LevelDot } from "@/components/ui/level-dot";
import { TypeDot } from "@/components/ui/type-dot";
import { formatMiles } from "@/lib/domain/geo";
import { affiliationKey } from "@/lib/labels";
import type { SchoolSummary } from "@/lib/schemas";

export interface PinCardProps {
  summary: SchoolSummary;
  /** The pin's number in the results list. */
  number: number;
  /**
   * Pinned cards come from a tap on a touch screen, where there is no hover:
   * they stay open, can be closed, and link to the school. Hover cards are a
   * passing preview and take no pointer events, so the pin under them stays
   * clickable.
   */
  pinned?: boolean;
  detailsHref?: string;
  onClose?: () => void;
}

/**
 * The facts shown when a map pin is hovered or tapped: the same facts as the
 * school's row in the list, trimmed to what fits beside a pin. Nothing here is
 * new information, so in hover mode it is hidden from assistive technology,
 * like the rest of the map; the list is the accessible path.
 */
export function PinCard({ summary, number, pinned = false, detailsHref, onClose }: PinCardProps) {
  const t = useTranslations("common");
  const labels = useTranslations("labels");
  const { school, distanceMeters, dashboard, enrollment } = summary;
  const join = (parts: Array<string | null | undefined>) => {
    const present = parts.filter((p): p is string => Boolean(p));
    return present.length ? present.reduce((a, b) => t("join", { a, b })) : "";
  };

  const span = school.gradesServed ?? school.gradesOffered;
  const grades = span ? gradeSpanText(t, labels, span) : null;
  const distance = Number.isFinite(distanceMeters)
    ? t("miles", { count: formatMiles(distanceMeters) })
    : null;
  const context =
    school.type === "private"
      ? school.affiliation
        ? labels(affiliationKey(school.affiliation))
        : null
      : school.district;
  const rated = (["ela", "math"] as const).filter((id) => dashboard[id]?.level);

  return (
    <div
      role={pinned ? "group" : undefined}
      aria-label={pinned ? school.name : undefined}
      aria-hidden={pinned ? undefined : true}
      className={[
        "flex w-60 flex-col gap-1 rounded-md border border-border bg-bg-raised p-3 text-left shadow-popover",
        pinned ? "" : "pointer-events-none",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-fg-on-accent">
          {number}
        </span>
        <span className="min-w-0 flex-1 text-md font-medium leading-snug text-fg">
          {school.name}
        </span>
        {pinned && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close")}
            className="-m-2 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted hover:text-fg"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      <TypeDot
        type={school.type}
        detail={join([grades, distance]) || undefined}
        className="text-sm"
      />
      {context || enrollment !== null ? (
        <p className="m-0 text-sm text-fg-secondary">
          {join([context, enrollment === null ? null : t("students", { count: enrollment })])}
        </p>
      ) : null}
      {rated.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-sm">
          {rated.map((id) => (
            <li key={id}>
              <LevelDot level={dashboard[id]?.level ?? null} indicator={id} className="text-sm" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-fg-muted">{t("notRated")}</p>
      )}
      {pinned && detailsHref ? (
        <IntentLink href={detailsHref as never} className="mt-1 w-fit text-base">
          {t("actions.details")}
        </IntentLink>
      ) : null}
    </div>
  );
}
