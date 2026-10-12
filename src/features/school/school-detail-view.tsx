import type { ComponentProps } from "react";
import type { Link } from "@/i18n/navigation";
import type { Coordinates, SchoolDetail, SchoolSummary, SchoolType } from "@/lib/schemas";
import { DashboardSection, dashboardYear } from "./dashboard-section";
import { FactsList } from "./facts-list";
import { NearbySection } from "./nearby-section";
import { SchoolHeader } from "./school-header";
import { SchoolStats } from "./school-stats";
import { SectionTabs, type SectionId } from "./section";
import { StudentsSection } from "./students-section";
import { TestsSection } from "./tests-section";

export interface SchoolDetailViewProps {
  detail: SchoolDetail;
  nearby: SchoolSummary[];
  /** Search state (address, lat, lng, filters, compare) to carry through every link. */
  query: Record<string, string>;
  /** The visitor's home when the URL carries lat and lng. */
  home?: Coordinates;
  /** The city or ZIP code searched, when the location is its center rather than a home address. */
  place?: string;
}

/** Which sections a school gets. Private schools have no Dashboard or CAASPP data. */
export function sectionsFor(type: SchoolType): SectionId[] {
  return type === "private"
    ? ["overview", "students", "nearby"]
    : ["overview", "dashboard", "tests", "students", "nearby"];
}

/**
 * The whole detail page below the site header, given its data. A grid with
 * named areas: one column on phones (facts after the stat row), content
 * plus a facts column from `lg` up.
 */
export function SchoolDetailView({ detail, nearby, query, home, place }: SchoolDetailViewProps) {
  const { school } = detail;
  const sections = sectionsFor(school.type);
  const backHref: ComponentProps<typeof Link>["href"] = { pathname: "/", query };

  return (
    <div className="grid max-w-[calc(var(--content-width)+var(--panel-width)+2.5rem)] grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:[grid-template-areas:'head_facts'_'tabs_facts'_'stats_facts'_'body_facts'] xl:grid-cols-[minmax(0,var(--content-width))_minmax(0,var(--panel-width))]">
      <div className="lg:[grid-area:head]">
        <SchoolHeader
          school={school}
          dashboardYear={dashboardYear(detail.dashboard)}
          backHref={backHref}
        />
      </div>
      <div className="lg:[grid-area:tabs]">
        <SectionTabs sections={sections} />
      </div>
      <div className="lg:[grid-area:stats]">
        <SchoolStats detail={detail} />
      </div>
      <aside className="lg:[grid-area:facts] lg:pt-2">
        <FactsList school={school} privateDetail={detail.privateDetail} home={home} place={place} />
      </aside>
      <div className="lg:[grid-area:body]">
        {sections.includes("dashboard") ? (
          <DashboardSection school={school} rows={detail.dashboard} />
        ) : null}
        {sections.includes("tests") ? (
          <TestsSection cds={school.cds} comparison={detail.caasppComparison} />
        ) : null}
        <StudentsSection enrollment={detail.enrollment} privateDetail={detail.privateDetail} />
        <NearbySection cds={school.cds} nearby={nearby} query={query} />
      </div>
    </div>
  );
}
