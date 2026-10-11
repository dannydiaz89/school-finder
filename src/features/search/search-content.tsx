import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PendingRegion, SearchPendingProvider } from "./pending";
import { cachedSearchSchools } from "@/lib/data/cached";
import {
  DEFAULT_PAGE_SIZE,
  parseSearchParams,
  serializeSearchParams,
  toSearchFilters,
  type SearchParams,
} from "@/lib/schemas";
import { FilterRow } from "./filter-row";
import { geocodeAddress, GeocodeError, GeocodeQuery } from "./geocode";
import { SearchResults } from "./results";

type RawSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The data-access API caps `limit` at 100, so "More schools" stops after four pages. */
const MAX_LIMIT = 100;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Search state plus the compare list, which is not search state but must survive a redirect. */
function searchHref(p: SearchParams, compare: string | undefined): string {
  const query = serializeSearchParams(p);
  if (compare) query.set("compare", compare);
  const qs = query.toString();
  return qs ? `/?${qs}` : "/";
}

type Translator = Awaited<ReturnType<typeof getTranslations<"search">>>;

/**
 * No coordinates yet. With an address, geocode it and redirect to the same
 * URL with lat/lng so the result is shareable; show the error states
 * otherwise. Without an address, the one-line prompt.
 */
async function geocodeAndRedirect(
  p: SearchParams,
  compare: string | undefined,
  locale: Locale,
  t: Translator,
) {
  if (!p.address) {
    return (
      <p className="m-0 max-w-[var(--content-width)] text-base text-fg-secondary">{t("intro")}</p>
    );
  }
  const query = GeocodeQuery.safeParse(p.address);
  if (!query.success) {
    return <EmptyState titleAs="h2" title={t("error.geocodeTitle")} body={t("error.geocode")} />;
  }
  let found;
  try {
    found = await geocodeAddress(query.data);
  } catch (error) {
    if (!(error instanceof GeocodeError)) throw error;
    return <EmptyState titleAs="h2" title={t("error.genericTitle")} body={t("error.generic")} />;
  }
  if (!found) {
    return <EmptyState titleAs="h2" title={t("error.geocodeTitle")} body={t("error.geocode")} />;
  }
  redirect({
    href: searchHref({ ...p, lat: found.latitude, lng: found.longitude, page: 1 }, compare),
    locale,
  });
}

/**
 * Everything on the search page that depends on the URL. Reads
 * `searchParams` (runtime data), so the page wraps it in Suspense.
 *
 * - lat/lng present: run the radius search and render results.
 * - only an address: geocode it and redirect to the same URL with lat/lng,
 *   so the resulting URL is shareable; on failure show the error.
 * - nothing: a one-line prompt.
 */
export async function SearchContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: RawSearchParams;
}) {
  const raw = await searchParams;
  const p = parseSearchParams(raw);
  const compare = first(raw.compare);
  const t = await getTranslations({ locale, namespace: "search" });

  const center =
    p.lat !== undefined && p.lng !== undefined ? { latitude: p.lat, longitude: p.lng } : null;
  if (!center) return geocodeAndRedirect(p, compare, locale, t);

  const result = await cachedSearchSchools({
    center,
    radiusMiles: p.radius,
    filters: toSearchFilters(p),
    sort: p.sort,
    limit: Math.min(MAX_LIMIT, DEFAULT_PAGE_SIZE * p.page),
    offset: 0,
  });

  const common = await getTranslations({ locale, namespace: "common" });
  const summary = common("join", {
    a: t("resultsSummary", { count: result.total, miles: p.radius }),
    b: t("resultsBreakdown", result.countsByType),
  });
  const year = result.schools.reduce<number | null>(
    (max, row) => (row.dashboard.year === null ? max : Math.max(max ?? 0, row.dashboard.year)),
    null,
  );

  // Keyed: elements handed to a client component as props are reconciled like array children.
  const header = (
    <div key="header" className="flex flex-col gap-2">
      <h2 className="m-0 text-base font-normal text-fg-secondary">{summary}</h2>
      {result.hiddenSpecialized > 0 && !p.specialized ? (
        <p className="m-0 text-sm text-fg-muted">
          {t("hiddenSpecialized", { count: result.hiddenSpecialized })}{" "}
          <TextLink href={searchHref({ ...p, specialized: true, page: 1 }, compare)}>
            {t("filters.showSpecialized")}
          </TextLink>
        </p>
      ) : null}
      {result.truncated ? <p className="m-0 text-sm text-fg-muted">{t("truncated")}</p> : null}
      {result.total === 0 ? (
        <EmptyState titleAs="h3" title={t("empty.title")} body={t("empty.body")} />
      ) : null}
    </div>
  );

  const footer =
    year !== null ? (
      <section key="footer" className="flex flex-col gap-2 pt-6">
        <h2 className="m-0 text-xl font-medium">{t("about.title")}</h2>
        <p className="m-0 text-base text-fg-secondary">{t("about.body", { year })}</p>
        <TextLink href="/about/data" className="w-fit">
          {t("about.link")}
        </TextLink>
      </section>
    ) : null;

  return (
    <SearchPendingProvider>
      <div className="flex flex-col gap-5">
        <FilterRow params={p} />
        <PendingRegion>
          <SearchResults
            result={result}
            params={p}
            center={center}
            header={header}
            footer={footer}
          />
        </PendingRegion>
      </div>
    </SearchPendingProvider>
  );
}
