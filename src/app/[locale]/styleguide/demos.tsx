"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Menu, type MenuOption } from "@/components/ui/menu";
import { ResultRow } from "@/components/ui/result-row";
import { TypeDot } from "@/components/ui/type-dot";
import { gradeBandKey, levelKey, programKey, schoolTypeKey } from "@/lib/labels";
import {
  DASHBOARD_LEVELS,
  GradeBand,
  Program,
  SCHOOL_TYPES,
  SortKey,
  type CdsCode,
  type SchoolSummary,
} from "@/lib/schemas";

/*
 * Interactive demos for the styleguide. Small client islands; the page
 * itself stays a server component. Sample state lives here and goes
 * nowhere.
 */

const DEFAULT_TYPES: string[] = ["district", "charter"];

export function FilterBarDemo() {
  const t = useTranslations();
  const format = useFormatter();
  const [types, setTypes] = useState<string[]>(DEFAULT_TYPES);
  const [bands, setBands] = useState<string[]>([]);
  const [rating, setRating] = useState<string>("yellow");
  const [programs, setPrograms] = useState<string[]>([]);
  const [sort, setSort] = useState<string>("distance");

  /** "Type: District, Charter" when narrowed, otherwise just "Type". */
  function triggerLabel(label: string, values: string[], word: (v: string) => string) {
    if (values.length === 0) return label;
    return t("common.filterValue", {
      label,
      value: format.list(values.map(word), { type: "unit" }),
    });
  }

  const typeOptions: MenuOption[] = SCHOOL_TYPES.map((type) => ({
    value: type,
    label: <TypeDot type={type} />,
  }));
  const bandOptions: MenuOption[] = GradeBand.options.map((band) => ({
    value: band,
    label: t(`labels.${gradeBandKey(band)}`),
  }));
  const ratingOptions: MenuOption[] = DASHBOARD_LEVELS.map((level) => ({
    value: level,
    label: t(`labels.${levelKey(level)}`),
  }));
  const programOptions: MenuOption[] = Program.options.map((program) => ({
    value: program,
    label: t(`labels.${programKey(program)}`),
  }));
  const sortOptions: MenuOption[] = SortKey.options.map((key) => ({
    value: key,
    label: t(`search.sort.${key}`),
  }));

  const isDefault =
    types.join() === DEFAULT_TYPES.join() &&
    bands.length === 0 &&
    rating === "yellow" &&
    programs.length === 0;

  return (
    <FilterBar
      label={t("search.filters.label")}
      onReset={() => {
        setTypes(DEFAULT_TYPES);
        setBands([]);
        setRating("yellow");
        setPrograms([]);
      }}
      resetDisabled={isDefault}
      sort={
        <Menu
          mode="single"
          label={triggerLabel(t("search.filters.sort"), [sort], (v) =>
            t(`search.sort.${v as SortKey}`),
          )}
          groupLabel={t("search.filters.sort")}
          options={sortOptions}
          value={sort}
          onApply={setSort}
          align="end"
          portal={false}
        />
      }
    >
      <Menu
        mode="multiple"
        label={triggerLabel(t("search.filters.type"), types, (v) =>
          t(`labels.${schoolTypeKey(v as (typeof SCHOOL_TYPES)[number])}`),
        )}
        groupLabel={t("search.filters.type")}
        options={typeOptions}
        value={types}
        onApply={setTypes}
        active={types.length < SCHOOL_TYPES.length}
        portal={false}
      />
      <Menu
        mode="multiple"
        label={triggerLabel(t("search.filters.grades"), bands, (v) =>
          t(`labels.${gradeBandKey(v as GradeBand)}`),
        )}
        groupLabel={t("search.filters.grades")}
        options={bandOptions}
        value={bands}
        onApply={setBands}
        active={bands.length > 0}
        portal={false}
      />
      <Menu
        mode="single"
        label={triggerLabel(t("search.filters.rating"), [rating], (v) =>
          t(`labels.${levelKey(v as (typeof DASHBOARD_LEVELS)[number])}`),
        )}
        groupLabel={t("search.filters.rating")}
        options={ratingOptions}
        value={rating}
        onApply={setRating}
        active={rating !== "yellow"}
        portal={false}
      />
      <Menu
        mode="multiple"
        label={triggerLabel(t("search.filters.programs"), programs, (v) =>
          t(`labels.${programKey(v as Program)}`),
        )}
        groupLabel={t("search.filters.programs")}
        options={programOptions}
        value={programs}
        onApply={setPrograms}
        active={programs.length > 0}
        portal={false}
      />
    </FilterBar>
  );
}

export function ResultListDemo({ summaries }: { summaries: SchoolSummary[] }) {
  const t = useTranslations("common");
  const [compare, setCompare] = useState<CdsCode[]>(() =>
    summaries[0] ? [summaries[0].school.cds] : [],
  );
  const toggle = (cds: CdsCode) =>
    setCompare((prev) => (prev.includes(cds) ? prev.filter((c) => c !== cds) : [...prev, cds]));

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-fg-muted">
        {t("nav.compareWithCount", { count: compare.length })}
      </p>
      <ol className="m-0 max-w-[var(--content-width)] list-none p-0">
        {summaries.map((summary, index) => (
          <ResultRow
            key={summary.school.cds}
            number={index + 1}
            summary={summary}
            href={`/school/${summary.school.cds}`}
            inCompare={compare.includes(summary.school.cds)}
            onToggleCompare={toggle}
            compareDisabled={compare.length >= 2}
          />
        ))}
      </ol>
      <div>
        <Button variant="text" size="sm" onClick={() => setCompare([])}>
          {t("actions.clearAll")}
        </Button>
      </div>
    </div>
  );
}
