import { getTranslations } from "next-intl/server";
import { requireLocale } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { TextLink } from "@/components/ui/text-link";

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

function Swatches() {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 list-none p-0 m-0">
      {COLOR_TOKENS.map((token) => (
        <li key={token} className="flex items-center gap-3 text-sm">
          <span
            aria-hidden="true"
            className="h-8 w-8 rounded-sm border border-border shrink-0"
            style={{ background: `var(--${token})` }}
          />
          <code className="text-fg-secondary">--{token}</code>
        </li>
      ))}
    </ul>
  );
}

function Components() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Button</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Apply</Button>
          <Button variant="secondary">Larger map</Button>
          <Button variant="text">Add to compare</Button>
          <Button variant="primary" size="sm">
            Apply
          </Button>
          <Button variant="secondary" size="sm">
            More schools
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Links</h3>
        <div className="flex flex-wrap items-center gap-6">
          <TextLink href="/" tone="link" className="text-2xl">
            Theodore Judah Elementary
          </TextLink>
          <TextLink href="/" tone="accent">
            Details
          </TextLink>
          <TextLink href="/" tone="muted">
            Data sources
          </TextLink>
          <ExternalLink href="https://www.cde.ca.gov">cde.ca.gov</ExternalLink>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Type scale</h3>
        <p className="text-5xl font-normal leading-tight">30 · School name on the detail page</p>
        <p className="text-2xl">20 · Result title</p>
        <p className="text-xl font-medium">18 · Section heading</p>
        <p className="text-base">14 · Body and table text</p>
        <p className="text-sm text-fg-muted">13 · Meta and captions</p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Hairline list</h3>
        <ul className="m-0 list-none p-0 max-w-[480px]">
          {["First row", "Second row", "Third row"].map((row) => (
            <li key={row} className="border-b border-hairline py-3 text-base">
              {row}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default async function StyleguidePage({ params }: PageProps<"/[locale]/styleguide">) {
  const locale = await requireLocale(params);
  const t = await getTranslations({ locale, namespace: "styleguide" });

  return (
    <main className="flex flex-col gap-8 px-7 pt-5 pb-10 pl-[var(--left-offset)]">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-normal">{t("title")}</h1>
        <p className="text-base text-fg-muted">{t("intro")}</p>
      </div>
      {(["light", "dark"] as const).map((theme) => (
        <section
          key={theme}
          data-theme={theme}
          className="flex flex-col gap-6 rounded-lg border border-border bg-bg p-6 text-fg"
        >
          <h2 className="text-xl font-medium capitalize">{theme}</h2>
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-medium">{t("tokens")}</h3>
            <Swatches />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-medium">{t("components")}</h3>
            <Components />
          </div>
        </section>
      ))}
    </main>
  );
}
