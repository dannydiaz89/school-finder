import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSection, dashboardYear } from "@/features/school/dashboard-section";
import { FactsList } from "@/features/school/facts-list";
import { gradeSpanText, joinParts } from "@/features/school/format";
import { NearbySection } from "@/features/school/nearby-section";
import { SchoolHeader } from "@/features/school/school-header";
import { SchoolStats } from "@/features/school/school-stats";
import { SectionTabs, type SectionId } from "@/features/school/section";
import { StudentsSection } from "@/features/school/students-section";
import { TestsSection } from "@/features/school/tests-section";
import { requireLocale } from "@/i18n/locale";
import { getNearby, getSchool } from "@/lib/data";
import { affiliationKey, schoolTypeLongKey } from "@/lib/labels";
import { CdsCode, parseCompareParams, type SchoolDetail } from "@/lib/schemas";

type Props = PageProps<"/[locale]/school/[cds]">;

const NEARBY_LIMIT = 5;

/**
 * School detail: the knowledge-panel page. `cds` and the search params are
 * runtime data, so everything that reads them sits inside the Suspense
 * boundary; the shell prerenders with a skeleton.
 */

async function loadSchool(params: Props["params"]): Promise<SchoolDetail> {
  const { cds } = await params;
  const parsed = CdsCode.safeParse(cds);
  if (!parsed.success) notFound();
  const detail = await getSchool({ cds: parsed.data });
  if (!detail) notFound();
  return detail;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await requireLocale(params);
  const { school } = await loadSchool(params);
  const common = await getTranslations({ locale, namespace: "common" });
  const labels = await getTranslations({ locale, namespace: "labels" });
  const span = school.gradesServed ?? school.gradesOffered;
  const description = joinParts(common, [
    labels(schoolTypeLongKey(school.type)),
    school.type === "private"
      ? school.affiliation
        ? labels(affiliationKey(school.affiliation))
        : null
      : school.district,
    span ? gradeSpanText(common, labels, span) : null,
    school.address.city,
  ]);
  return { title: school.name, description };
}

export default function SchoolPage({ params, searchParams }: Props) {
  return (
    <main className="px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <Suspense fallback={<SchoolSkeleton />}>
        <SchoolContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SchoolContent({ params, searchParams }: Props) {
  await requireLocale(params);
  const detail = await loadSchool(params);
  const raw = await searchParams;
  const { school } = detail;
  const nearby = await getNearby({ cds: school.cds, limit: NEARBY_LIMIT });

  // Carry the visitor's search state (address, radius, filters, compare list) through every link.
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value !== "") query[key] = value;
  }
  const { lat, lng } = parseCompareParams(raw);
  const home =
    lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : undefined;

  const isPrivate = school.type === "private";
  const sections: SectionId[] = isPrivate
    ? ["overview", "students", "nearby"]
    : ["overview", "dashboard", "tests", "students", "nearby"];

  return (
    <div className="grid max-w-[calc(var(--content-width)+var(--panel-width)+2.5rem)] grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,var(--content-width))_minmax(0,var(--panel-width))] lg:[grid-template-areas:'head_facts'_'tabs_facts'_'stats_facts'_'body_facts']">
      <div className="lg:[grid-area:head]">
        <SchoolHeader
          school={school}
          dashboardYear={dashboardYear(detail.dashboard)}
          backHref={{ pathname: "/", query }}
        />
      </div>
      <div className="lg:[grid-area:tabs]">
        <SectionTabs sections={sections} />
      </div>
      <div className="lg:[grid-area:stats]">
        <SchoolStats detail={detail} />
      </div>
      <aside className="lg:[grid-area:facts] lg:pt-2">
        <FactsList school={school} privateDetail={detail.privateDetail} home={home} />
      </aside>
      <div className="lg:[grid-area:body]">
        {isPrivate ? null : (
          <>
            <DashboardSection school={school} rows={detail.dashboard} />
            <TestsSection cds={school.cds} comparison={detail.caasppComparison} />
          </>
        )}
        <StudentsSection enrollment={detail.enrollment} privateDetail={detail.privateDetail} />
        <NearbySection cds={school.cds} nearby={nearby} query={query} />
      </div>
    </div>
  );
}

function SchoolSkeleton() {
  return (
    <div className="flex max-w-[var(--content-width)] flex-col gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton lines={4} className="mt-6" />
    </div>
  );
}
