"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { LevelDot } from "@/components/ui/level-dot";
import { Menu, type MenuOption } from "@/components/ui/menu";
import { TypeDot } from "@/components/ui/type-dot";
import { usePathname, useRouter } from "@/i18n/navigation";
import { affiliationKey, gradeBandKey, levelKey, programKey, schoolTypeKey } from "@/lib/labels";
import {
  Affiliation,
  DASHBOARD_LEVELS,
  DEFAULT_SEARCH_FILTERS,
  GradeBand,
  Program,
  SCHOOL_TYPES,
  SchoolType,
  SortKey,
  serializeSearchParams,
  type SearchParams,
} from "@/lib/schemas";

const SPECIALIZED = "specialized";
const ANY = "any";
const SIZE_OPTIONS = [300, 500, 800, 1200];

/** Keep only the values that belong to `options`, in option order. */
function only<T extends string>(options: readonly T[], values: readonly string[]): T[] {
  return options.filter((o) => values.includes(o));
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/**
 * The filter row under the address field. Each menu holds a draft until
 * Apply, then writes the new state to the URL with `router.replace`; the
 * page re-renders on the server with the new results. The compare list is
 * not part of search state, so it is copied over from the current URL.
 */
export function FilterRow({ params }: { params: SearchParams }) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();

  function apply(patch: Partial<SearchParams>) {
    const query = serializeSearchParams({ ...params, ...patch, page: 1 });
    const compare = current.get("compare");
    if (compare) query.set("compare", compare);
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** "Type: District, Charter" when narrowed, otherwise the bare label. */
  function triggerLabel(label: string, values: string[]) {
    if (values.length === 0) return label;
    return t("common.filterValue", { label, value: format.list(values, { type: "unit" }) });
  }

  // Type (plus the specialized-placements toggle)
  const typesNarrowed = !sameSet(params.types, DEFAULT_SEARCH_FILTERS.types);
  const typeOptions: MenuOption[] = [
    ...SCHOOL_TYPES.map((type) => ({ value: type, label: <TypeDot type={type} /> })),
    {
      value: SPECIALIZED,
      label: t("search.filters.showSpecialized"),
      description: t("search.filters.specializedDescription"),
    },
  ];
  const typeValue = [...params.types, ...(params.specialized ? [SPECIALIZED] : [])];
  const typeWords = [
    ...(typesNarrowed ? params.types.map((v) => t(`labels.${schoolTypeKey(v)}`)) : []),
    ...(params.specialized ? [t("search.filters.specializedShort")] : []),
  ];

  // Grades
  const gradeOptions: MenuOption[] = GradeBand.options.map((band) => ({
    value: band,
    label: t(`labels.${gradeBandKey(band)}`),
  }));

  // Rating: minimum ELA level, highest first
  const ratingOptions: MenuOption[] = [
    { value: ANY, label: t("search.filters.any") },
    ...[...DASHBOARD_LEVELS].reverse().map((level) => ({
      value: level,
      label: <LevelDot level={level} />,
    })),
  ];

  // Programs and private affiliation share one menu
  const programOptions: MenuOption[] = [
    ...Program.options.map((p) => ({ value: p, label: t(`labels.${programKey(p)}`) })),
    ...Affiliation.options.map((a) => ({
      value: a,
      label: t(`labels.${affiliationKey(a)}`),
      description: t("search.filters.privateOnly"),
    })),
  ];
  const programValue = [...params.programs, ...params.affiliations];
  const programWords = [
    ...params.programs.map((p) => t(`labels.${programKey(p)}`)),
    ...params.affiliations.map((a) => t(`labels.${affiliationKey(a)}`)),
  ];

  // Size: maximum enrollment
  const sizes =
    params.size && !SIZE_OPTIONS.includes(params.size)
      ? [...SIZE_OPTIONS, params.size].sort((a, b) => a - b)
      : SIZE_OPTIONS;
  const sizeOptions: MenuOption[] = [
    { value: ANY, label: t("search.filters.any") },
    ...sizes.map((n) => ({ value: String(n), label: t("search.filters.sizeValue", { count: n }) })),
  ];

  const sortOptions: MenuOption[] = SortKey.options.map((key) => ({
    value: key,
    label: t(`search.sort.${key}`),
  }));

  const isDefault =
    !typesNarrowed &&
    !params.specialized &&
    params.grades.length === 0 &&
    params.programs.length === 0 &&
    params.affiliations.length === 0 &&
    params.rating === null &&
    params.size === null &&
    params.sort === "distance";

  return (
    <FilterBar
      label={t("search.filters.label")}
      onReset={() =>
        apply({
          types: DEFAULT_SEARCH_FILTERS.types,
          specialized: false,
          grades: [],
          programs: [],
          affiliations: [],
          rating: null,
          size: null,
          sort: "distance",
        })
      }
      resetDisabled={isDefault}
      sort={
        <Menu
          mode="single"
          label={triggerLabel(t("search.filters.sort"), [t(`search.sort.${params.sort}`)])}
          groupLabel={t("search.filters.sortGroup")}
          options={sortOptions}
          value={params.sort}
          onApply={(value) => apply({ sort: SortKey.parse(value) })}
          align="end"
        />
      }
    >
      <Menu
        mode="multiple"
        label={triggerLabel(t("search.filters.type"), typeWords)}
        groupLabel={t("search.filters.typeGroup")}
        options={typeOptions}
        value={typeValue}
        onApply={(values) => {
          const types = only(SchoolType.options, values);
          apply({
            types: types.length ? types : DEFAULT_SEARCH_FILTERS.types,
            specialized: values.includes(SPECIALIZED),
          });
        }}
        active={typeWords.length > 0}
      />
      <Menu
        mode="multiple"
        label={triggerLabel(
          t("search.filters.grades"),
          params.grades.map((b) => t(`labels.${gradeBandKey(b)}`)),
        )}
        groupLabel={t("search.filters.gradesGroup")}
        options={gradeOptions}
        value={params.grades}
        onApply={(values) => apply({ grades: only(GradeBand.options, values) })}
        active={params.grades.length > 0}
      />
      <Menu
        mode="single"
        label={triggerLabel(
          t("search.filters.rating"),
          params.rating
            ? [t("search.filters.ratingValue", { level: t(`labels.${levelKey(params.rating)}`) })]
            : [],
        )}
        groupLabel={t("search.filters.ratingGroup")}
        options={ratingOptions}
        value={params.rating ?? ANY}
        onApply={(value) =>
          apply({ rating: value === ANY ? null : DASHBOARD_LEVELS.find((l) => l === value) })
        }
        active={params.rating !== null}
      />
      <Menu
        mode="multiple"
        label={triggerLabel(t("search.filters.programs"), programWords)}
        groupLabel={t("search.filters.programsGroup")}
        options={programOptions}
        value={programValue}
        onApply={(values) =>
          apply({
            programs: only(Program.options, values),
            affiliations: only(Affiliation.options, values),
          })
        }
        active={programWords.length > 0}
      />
      <Menu
        mode="single"
        label={triggerLabel(
          t("search.filters.size"),
          params.size ? [t("search.filters.sizeValue", { count: params.size })] : [],
        )}
        groupLabel={t("search.filters.sizeGroup")}
        options={sizeOptions}
        value={params.size ? String(params.size) : ANY}
        onApply={(value) => apply({ size: value === ANY ? null : Number(value) })}
        active={params.size !== null}
      />
    </FilterBar>
  );
}
