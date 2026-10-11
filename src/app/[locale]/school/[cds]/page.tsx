import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { gradeSpanText, joinParts } from "@/features/school/format";
import { SchoolDetailView } from "@/features/school/school-detail-view";
import { requireLocale } from "@/i18n/locale";
import { cachedGetNearby, cachedGetSchool } from "@/lib/data/cached";
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
  const detail = await cachedGetSchool({ cds: parsed.data });
  if (!detail) notFound();
  return detail;
}

/** "<School name> · School Finder" (the layout adds the suffix) and a line of directory facts. */
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

async function loadNearby(params: Props["params"]) {
  const parsed = CdsCode.safeParse((await params).cds);
  // An invalid or unknown code is reported by loadSchool; there is nothing nearby to list.
  return parsed.success ? cachedGetNearby({ cds: parsed.data, limit: NEARBY_LIMIT }) : [];
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
  // The school and its neighbors only need the code from the URL, so fetch them together.
  const [detail, raw, nearby] = await Promise.all([
    loadSchool(params),
    searchParams,
    loadNearby(params),
  ]);

  // Carry the visitor's search state (address, radius, filters, compare list) through every link.
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value !== "") query[key] = value;
  }
  const { lat, lng } = parseCompareParams(raw);
  const home =
    lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : undefined;

  return <SchoolDetailView detail={detail} nearby={nearby} query={query} home={home} />;
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
