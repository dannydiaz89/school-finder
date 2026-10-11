import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { requireLocale } from "@/i18n/locale";
import { Bar } from "@/components/ui/bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ExternalLink } from "@/components/ui/external-link";
import { KeyValueList } from "@/components/ui/key-value-list";
import { LevelDot } from "@/components/ui/level-dot";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatRow } from "@/components/ui/stat-row";
import {
  Table,
  TableBody,
  TableCell,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { TextField } from "@/components/ui/text-field";
import { TextLink } from "@/components/ui/text-link";
import { TypeDot } from "@/components/ui/type-dot";
import { fixtures } from "@/fixtures";
import { formatMiles } from "@/lib/domain/geo";
import { allGradesMetAndAbove, toSummary } from "@/lib/domain/records";
import { gradeKey, yesNoKey } from "@/lib/labels";
import {
  DASHBOARD_LEVELS,
  SCHOOL_TYPES,
  SortKey,
  type SchoolRecord,
  type SchoolSummary,
} from "@/lib/schemas";
import { FilterBarDemo, ResultListDemo } from "./demos";

const COLOR_TOKENS = [
  "bg",
  "bg-subtle",
  "fg",
  "fg-secondary",
  "fg-muted",
  "link",
  "accent",
  "accent-subtle",
  "hairline",
  "border",
  "level-red",
  "level-orange",
  "level-yellow",
  "level-green",
  "level-blue",
  "type-district",
  "type-charter",
  "type-private",
] as const;

/** Downtown Sacramento, so the fixture schools sit a few miles away. */
const HOME = { latitude: 38.5781, longitude: -121.4944 };

/** Sample records: one district, one charter, one private school from the fixtures. */
function sampleRecords(): SchoolRecord[] {
  return SCHOOL_TYPES.flatMap((type) => {
    const match = fixtures.schools.find(
      (r) => r.school.type === type && r.school.coordinates && r.dashboard.length > 0,
    );
    const fallback = fixtures.schools.find((r) => r.school.type === type);
    const record = match ?? fallback;
    return record ? [record] : [];
  });
}

function Swatches() {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-0">
      {COLOR_TOKENS.map((token) => (
        <li key={token} className="flex items-center gap-3 text-sm">
          <span
            aria-hidden="true"
            className="h-8 w-8 shrink-0 rounded-sm border border-border"
            style={{ background: `var(--${token})` }}
          />
          <code className="text-fg-secondary">--{token}</code>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 text-base font-medium">{title}</h3>
      {children}
    </section>
  );
}

function PinIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default async function StyleguidePage({ params }: PageProps<"/[locale]/styleguide">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale });
  const format = await getFormatter({ locale });

  const records = sampleRecords();
  const summaries: SchoolSummary[] = records.map((r) => toSummary(r, HOME));
  const subject = records[0];
  const subjectSummary = summaries[0];
  const districtRows = fixtures.districtCaaspp[subject?.school.districtCds ?? ""] ?? [];
  const ela = subject
    ? {
        school: allGradesMetAndAbove(subject.caaspp, "ela"),
        district: allGradesMetAndAbove(districtRows, "ela"),
        state: allGradesMetAndAbove(fixtures.stateCaaspp, "ela"),
      }
    : null;
  const pct = (fraction: number | null | undefined) =>
    fraction === null || fraction === undefined
      ? t("common.notReported")
      : format.number(fraction, { style: "percent", maximumFractionDigits: 0 });
  const grades = (r: SchoolRecord) => {
    const span = r.school.gradesServed ?? r.school.gradesOffered;
    return span
      ? t("common.gradeSpan", {
          low: t(`labels.${gradeKey(span.low)}`),
          high: t(`labels.${gradeKey(span.high)}`),
        })
      : t("common.noData");
  };

  const sortOptions = SortKey.options.map((key) => ({
    value: key,
    label: t(`search.sort.${key}`),
  }));
  const year = subject?.dashboard[0]?.year ?? 2025;

  const components = (
    <div className="flex flex-col gap-8">
      <Section title="Button">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">{t("common.actions.apply")}</Button>
          <Button variant="secondary">{t("search.map.largerMap")}</Button>
          <Button variant="text">{t("common.actions.addToCompare")}</Button>
          <Button variant="primary" size="sm">
            {t("common.actions.apply")}
          </Button>
          <Button variant="secondary" size="sm">
            {t("common.actions.showMore")}
          </Button>
          <Button variant="primary" disabled>
            {t("common.actions.apply")}
          </Button>
        </div>
      </Section>

      <Section title="TextLink, ExternalLink">
        <div className="flex flex-wrap items-center gap-6">
          <TextLink href="/" tone="link" className="text-2xl">
            {subject?.school.name}
          </TextLink>
          <TextLink href="/" tone="accent">
            {t("common.actions.details")}
          </TextLink>
          <TextLink href="/" tone="muted">
            {t("common.nav.data")}
          </TextLink>
          <ExternalLink href="https://www.cde.ca.gov">cde.ca.gov</ExternalLink>
        </div>
      </Section>

      <Section title="Type scale">
        <p className="m-0 text-5xl font-normal leading-tight">
          30 · {t("school.sections.overview")}
        </p>
        <p className="m-0 text-2xl">20 · {t("search.title")}</p>
        <p className="m-0 text-xl font-medium">18 · {t("school.sections.dashboard")}</p>
        <p className="m-0 text-base">14 · {t("compare.subtitle", { address: "1420 J Street" })}</p>
        <p className="m-0 text-sm text-fg-muted">13 · {t("school.sections.testsNote", { year })}</p>
      </Section>

      <Section title="TextField, Select, Checkbox">
        <div className="grid max-w-[640px] grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label={t("search.addressLabel")}
            placeholder={t("search.addressPlaceholder")}
            leadingIcon={<PinIcon />}
            defaultValue="1420 J Street, Sacramento, CA 95814"
          />
          <TextField
            label={t("search.addressLabel")}
            hint={t("search.addressPlaceholder")}
            error={t("search.error.geocode")}
            defaultValue="1420 J"
          />
          <Select label={t("search.filters.sort")} options={sortOptions} defaultValue="distance" />
          <div className="flex flex-col">
            {SCHOOL_TYPES.map((type) => (
              <Checkbox
                key={type}
                label={<TypeDot type={type} />}
                defaultChecked={type !== "private"}
              />
            ))}
            <Checkbox label={t("search.filters.showSpecialized")} disabled />
          </div>
        </div>
      </Section>

      <Section title="FilterBar, FilterButton, Menu">
        <FilterBarDemo />
      </Section>

      <Section title="Popover, Dialog">
        <div className="flex flex-wrap items-center gap-4">
          <Popover
            trigger={<Button variant="text">{t("search.about.title")}</Button>}
            label={t("search.about.title")}
            portal={false}
            className="max-w-[360px]"
          >
            <p className="m-0 text-base text-fg-secondary">{t("search.about.body", { year })}</p>
            <p className="m-0 mt-2">
              <TextLink href="/about/data">{t("search.about.link")}</TextLink>
            </p>
          </Popover>
          <Dialog
            trigger={<Button variant="secondary">{t("search.filters.label")}</Button>}
            title={t("search.filters.label")}
            description={t("search.filters.type")}
            footer={
              <>
                <DialogClose asChild>
                  <Button variant="text" className="h-11 px-3">
                    {t("common.actions.cancel")}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">{t("common.actions.apply")}</Button>
                </DialogClose>
              </>
            }
          >
            <div className="flex flex-col">
              {SCHOOL_TYPES.map((type) => (
                <Checkbox key={type} label={<TypeDot type={type} />} defaultChecked />
              ))}
            </div>
          </Dialog>
        </div>
      </Section>

      <Section title="LevelDot, TypeDot">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {DASHBOARD_LEVELS.map((level) => (
            <LevelDot key={level} level={level} />
          ))}
          <LevelDot level={null} />
          <LevelDot level="green" indicator="ela" />
          <LevelDot level="orange" indicator="chronicAbsenteeism" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {SCHOOL_TYPES.map((type) => (
            <TypeDot key={type} type={type} />
          ))}
          <TypeDot type="charter" detail={t("common.miles", { count: 1.4 })} />
        </div>
      </Section>

      {subject && subjectSummary ? (
        <Section title="StatRow">
          <div className="max-w-[var(--content-width)]">
            <StatRow
              stats={[
                {
                  key: "enrollment",
                  value: format.number(subjectSummary.enrollment ?? 0),
                  label: t("school.stats.enrollment", { year: subject.enrollment?.year ?? "" }),
                },
                {
                  key: "ratio",
                  value: subjectSummary.studentTeacherRatio
                    ? t("common.ratio", { count: subjectSummary.studentTeacherRatio })
                    : t("common.noData"),
                  label: t("school.stats.studentTeacher"),
                },
                {
                  key: "frpm",
                  value: pct(subject.frpm?.pctFrpm),
                  label: t("school.stats.frpm"),
                },
                {
                  key: "el",
                  value: pct(
                    subject.enrollment?.englishLearners !== undefined
                      ? subject.enrollment.englishLearners / subject.enrollment.total
                      : null,
                  ),
                  label: t("school.stats.englishLearners"),
                },
              ]}
            />
          </div>
        </Section>
      ) : null}

      {subject && ela ? (
        <Section title="Bar">
          <div className="flex max-w-[var(--content-width)] flex-col gap-2">
            <Bar
              label={t("labels.indicator.elaShort")}
              value={ela.school ?? 0}
              valueLabel={ela.school === null ? t("common.notTested") : pct(ela.school / 100)}
              emphasis
            />
            <Bar
              label={t("school.compare.district")}
              value={ela.district ?? 0}
              valueLabel={ela.district === null ? t("common.notTested") : pct(ela.district / 100)}
              tone="secondary"
            />
            <Bar
              label={t("school.compare.state")}
              value={ela.state ?? 0}
              valueLabel={ela.state === null ? t("common.notTested") : pct(ela.state / 100)}
              tone="secondary"
            />
          </div>
        </Section>
      ) : null}

      {subject ? (
        <Section title="KeyValueList">
          <div className="max-w-[480px]">
            <KeyValueList
              items={[
                {
                  key: "address",
                  label: t("school.facts.address"),
                  value: `${subject.school.address.street}, ${subject.school.address.city}, CA ${subject.school.address.zip}`,
                },
                {
                  key: "phone",
                  label: t("school.facts.phone"),
                  value: subject.school.phone ?? t("common.notReported"),
                },
                { key: "grades", label: t("school.facts.grades"), value: grades(subject) },
                {
                  key: "type",
                  label: t("school.facts.type"),
                  value: <TypeDot type={subject.school.type} />,
                },
                {
                  key: "magnet",
                  label: t("school.facts.magnet"),
                  value: t(`labels.${yesNoKey(subject.school.magnet ?? false)}`),
                },
                { key: "cds", label: t("school.facts.cds"), value: subject.school.cds },
              ]}
            />
          </div>
        </Section>
      ) : null}

      <Section title="Table">
        <Table minWidth={640}>
          <TableHead>
            <TableRow header>
              <TableCell />
              {records.map((r) => (
                <TableHeaderCell key={r.school.cds}>
                  <span className="flex flex-col gap-1">
                    <TextLink href={`/school/${r.school.cds}`} tone="link" className="text-lg">
                      {r.school.name}
                    </TextLink>
                    <TypeDot type={r.school.type} detail={grades(r)} className="text-sm" />
                  </span>
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableGroupRow colSpan={records.length + 1}>
              {t("compare.groups.location")}
            </TableGroupRow>
            <TableRow>
              <TableHeaderCell scope="row">{t("compare.rows.distance")}</TableHeaderCell>
              {summaries.map((s, i) => (
                <TableCell key={s.school.cds} emphasis={i === 0}>
                  {t("common.miles", { count: formatMiles(s.distanceMeters) })}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableHeaderCell scope="row">{t("compare.rows.grades")}</TableHeaderCell>
              {records.map((r) => (
                <TableCell key={r.school.cds}>{grades(r)}</TableCell>
              ))}
            </TableRow>
            <TableGroupRow colSpan={records.length + 1}>
              {t("compare.groups.dashboard", { year })}
            </TableGroupRow>
            {(["ela", "math"] as const).map((indicator) => (
              <TableRow key={indicator}>
                <TableHeaderCell scope="row">{t(`labels.indicator.${indicator}`)}</TableHeaderCell>
                {summaries.map((s) => {
                  const level = s.dashboard[indicator]?.level ?? null;
                  return s.school.type === "private" ? (
                    <TableCell key={s.school.cds} muted>
                      {t("common.notRated")}
                    </TableCell>
                  ) : (
                    <TableCell key={s.school.cds}>
                      <LevelDot level={level} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow>
              <TableHeaderCell scope="row">{t("compare.rows.enrollment")}</TableHeaderCell>
              {summaries.map((s) => (
                <TableCell key={s.school.cds} muted={s.enrollment === null}>
                  {s.enrollment === null ? t("common.notReported") : format.number(s.enrollment)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Skeleton, EmptyState">
        <div className="flex max-w-[var(--content-width)] flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-72" />
            <Skeleton lines={3} />
          </div>
          <EmptyState
            title={t("search.empty.title")}
            body={t("search.empty.body")}
            action={<Button variant="secondary">{t("common.actions.reset")}</Button>}
          />
        </div>
      </Section>

      <Section title="ResultRow">
        <ResultListDemo summaries={summaries} />
      </Section>
    </div>
  );

  return (
    <main className="flex flex-col gap-8 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-3xl font-normal">{t("styleguide.title")}</h1>
        <p className="m-0 text-base text-fg-muted">{t("styleguide.intro")}</p>
      </div>
      {(["light", "dark"] as const).map((theme) => (
        <section
          key={theme}
          data-theme={theme}
          className="flex flex-col gap-6 rounded-lg border border-border bg-bg p-6 text-fg"
        >
          <h2 className="m-0 text-xl font-medium capitalize">{theme}</h2>
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-base font-medium">{t("styleguide.tokens")}</h3>
            <Swatches />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="m-0 text-base font-medium">{t("styleguide.components")}</h3>
            {components}
          </div>
        </section>
      ))}
    </main>
  );
}
