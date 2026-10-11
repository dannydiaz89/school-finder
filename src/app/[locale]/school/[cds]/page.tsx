import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireLocale } from "@/i18n/locale";
import { getSchool } from "@/lib/data";
import { CdsCode } from "@/lib/schemas";

/**
 * School detail. Stage 0 placeholder; the Detail workstream replaces this file.
 *
 * `cds` is runtime data (not in generateStaticParams), so with Cache
 * Components the part that reads it must sit inside a Suspense boundary.
 * The shell above it is prerendered.
 */
export default function SchoolPage({ params }: PageProps<"/[locale]/school/[cds]">) {
  return (
    <main className="flex flex-col gap-3 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <Suspense fallback={<SchoolSkeleton />}>
        <SchoolContent params={params} />
      </Suspense>
    </main>
  );
}

async function SchoolContent({ params }: Pick<PageProps<"/[locale]/school/[cds]">, "params">) {
  const locale = await requireLocale(params);
  const { cds } = await params;
  const parsed = CdsCode.safeParse(cds);
  if (!parsed.success) notFound();
  const detail = await getSchool({ cds: parsed.data });
  if (!detail) notFound();
  const t = await getTranslations({ locale, namespace: "school" });

  return (
    <>
      <h1 className="text-5xl font-normal leading-tight">{detail.school.name}</h1>
      <p className="text-md text-fg-muted">
        {detail.school.district} · {detail.school.address.city}
      </p>
      <h2 className="text-xl font-medium mt-4">{t("sections.facts")}</h2>
      <dl className="grid grid-cols-[128px_1fr] gap-x-3 text-base max-w-[652px]">
        <dt className="py-3 border-b border-hairline text-fg-muted">{t("facts.cds")}</dt>
        <dd className="py-3 border-b border-hairline tabular-nums">{detail.school.cds}</dd>
        <dt className="py-3 text-fg-muted">{t("facts.address")}</dt>
        <dd className="py-3">
          {detail.school.address.street}, {detail.school.address.city}, CA{" "}
          {detail.school.address.zip}
        </dd>
      </dl>
    </>
  );
}

function SchoolSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 max-w-[652px]">
      <div className="h-9 w-2/3 rounded-sm bg-bg-subtle" />
      <div className="h-5 w-1/3 rounded-sm bg-bg-subtle" />
    </div>
  );
}
