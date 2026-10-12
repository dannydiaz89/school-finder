import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { TextLink } from "@/components/ui/text-link";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PendingRegion, SearchPendingProvider } from "./pending";
import { cachedFindSchoolsByName, cachedSearchSchools } from "@/lib/data/cached";
import {
  type GeocodeResult,
  DEFAULT_PAGE_SIZE,
  parseSearchParams,
  serializeSearchParams,
  toSearchFilters,
  type SearchParams,
} from "@/lib/schemas";
import { FilterRow } from "./filter-row";
import { geocodeAddress, GeocodeError, GeocodeQuery } from "./geocode";
import { NameResults } from "./name-results";
import { isZipOnly, locatePlace } from "./places";
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

/** Name matches listed on one page; more than this and the visitor should add a word. */
const NAME_LIMIT = 40;

/**
 * No coordinates yet: work out what the text means.
 *
 * 1. A city or ZIP code resolves from the bundled table and redirects to the
 *    same URL with its center, so the result is shareable.
 * 2. Text that starts with a house number is a street address: geocode it.
 * 3. Anything else is tried as a school name, then as an address without a
 *    number ("Capitol Mall, Sacramento").
 *
 * `by=name` skips straight to the name search, for names that are also
 * cities ("Lincoln").
 */
async function resolveQuery(
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
  const notFound = (
    <EmptyState titleAs="h2" title={t("error.geocodeTitle")} body={t("error.geocode")} />
  );
  const query = GeocodeQuery.safeParse(p.address);
  if (!query.success) return notFound;
  const text = query.data;

  const toLocation = (found: GeocodeResult) =>
    redirect({
      href: searchHref(
        {
          ...p,
          lat: found.latitude,
          lng: found.longitude,
          loc: found.kind === "address" ? undefined : found.kind,
          by: undefined,
          page: 1,
        },
        compare,
      ),
      locale,
    });

  const byName = async () => {
    const matches = await cachedFindSchoolsByName({ query: text, limit: NAME_LIMIT });
    if (matches.length === 0) return null;
    return (
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-base font-normal text-fg-secondary">
          {matches.length >= NAME_LIMIT
            ? t("names.summaryCapped", { count: NAME_LIMIT, query: text })
            : t("names.summary", { count: matches.length, query: text })}
        </h2>
        <p className="m-0 max-w-[var(--content-width)] text-sm text-fg-muted">
          {matches.length >= NAME_LIMIT ? t("names.limit") : t("names.hint")}
        </p>
        <NameResults matches={matches} />
      </section>
    );
  };

  if (p.by === "name") return (await byName()) ?? notFound;

  const place = locatePlace(text);
  const looksLikeStreetAddress = /^\s*\d/.test(text) && !isZipOnly(text);
  if (!place && !looksLikeStreetAddress && !isZipOnly(text)) {
    const names = await byName();
    if (names) return names;
  }

  let found;
  try {
    found = await geocodeAddress(text);
  } catch (error) {
    if (!(error instanceof GeocodeError)) throw error;
    return <EmptyState titleAs="h2" title={t("error.genericTitle")} body={t("error.generic")} />;
  }
  if (!found) return notFound;
  toLocation(found);
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
  if (!center) return resolveQuery(p, compare, locale, t);

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

  // A city name can also be a school name ("Lincoln"). Offer the name search when it would find something.
  const alsoNamed =
    p.loc === "city" && p.address
      ? (await cachedFindSchoolsByName({ query: p.address, limit: 1 }).catch(() => [])).length > 0
      : false;

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
      {alsoNamed ? (
        <p className="m-0 text-sm text-fg-muted">
          <TextLink
            href={searchHref(
              { ...p, lat: undefined, lng: undefined, loc: undefined, by: "name", page: 1 },
              compare,
            )}
          >
            {t("names.alsoNamed", { query: p.address ?? "" })}
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
