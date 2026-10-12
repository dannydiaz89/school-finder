import { useTranslations } from "next-intl";
import { Suspense, type ComponentProps } from "react";
import { ExternalLink } from "@/components/ui/external-link";
import { Skeleton } from "@/components/ui/skeleton";
import { IntentLink } from "@/components/ui/intent-link";
import { TypeDot } from "@/components/ui/type-dot";
import type { Link } from "@/i18n/navigation";
import { affiliationKey, instructionLevelKey } from "@/lib/labels";
import type { School } from "@/lib/schemas";
import { MySchoolsToggle } from "@/features/my-schools/my-schools-toggle";
import { CompareToggle } from "./compare-toggle";
import { gradeSpanText, joinParts } from "./format";
import { dashboardReportUrl, directionsUrl } from "./links";

export interface SchoolHeaderProps {
  school: School;
  /** Latest Dashboard reporting year with rows for this school; null hides the Dashboard link. */
  dashboardYear: number | null;
  /** Search page with the visitor's address and filters carried through. */
  backHref: ComponentProps<typeof Link>["href"];
}

/**
 * Knowledge-panel header: back link, 30px name, gray type line, text actions.
 */
export function SchoolHeader({ school, dashboardYear, backHref }: SchoolHeaderProps) {
  const t = useTranslations("school");
  const common = useTranslations("common");
  const labels = useTranslations("labels");

  const span = school.gradesServed ?? school.gradesOffered;
  const context =
    school.type === "private"
      ? school.affiliation
        ? labels(affiliationKey(school.affiliation))
        : null
      : school.district;
  const subtitle = joinParts(common, [
    school.instructionLevel ? labels(instructionLevelKey(school.instructionLevel)) : null,
    context,
    span ? gradeSpanText(common, labels, span) : null,
  ]);

  return (
    <header className="flex flex-col gap-2">
      <IntentLink href={backHref} tone="muted" className="w-fit text-base">
        {t("backToResults")}
      </IntentLink>
      <h1 className="m-0 text-5xl font-normal leading-tight text-fg">{school.name}</h1>
      <p className="m-0 text-base text-fg-secondary">
        <TypeDot type={school.type} detail={subtitle || undefined} />
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-base">
        <Suspense fallback={<Skeleton className="h-4 w-28" />}>
          <CompareToggle cds={school.cds} />
        </Suspense>
        <MySchoolsToggle cds={school.cds} />
        {school.website ? (
          <ExternalLink href={school.website}>{common("actions.website")}</ExternalLink>
        ) : null}
        {school.type !== "private" && dashboardYear !== null ? (
          <ExternalLink href={dashboardReportUrl(school.cds, dashboardYear)}>
            {t("links.dashboard")}
          </ExternalLink>
        ) : null}
        <ExternalLink href={directionsUrl(school.address)}>{t("links.directions")}</ExternalLink>
      </div>
    </header>
  );
}
