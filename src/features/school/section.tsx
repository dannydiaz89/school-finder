import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export const SECTION_IDS = ["overview", "dashboard", "tests", "students", "nearby"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface SectionProps {
  id: SectionId;
  title: string;
  /** Gray line under the heading: the source and year. */
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * One titled block of the detail page. The id is the in-page anchor the
 * tab row links to; `scroll-mt` keeps the heading clear of the top edge.
 */
export function Section({ id, title, note, children, className }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cx("flex scroll-mt-4 flex-col gap-3 border-b border-hairline py-5", className)}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="m-0 text-xl font-medium text-fg">
          {title}
        </h2>
        {note ? <p className="m-0 text-sm text-fg-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The section tab row: in-page anchor links styled like the filter tabs,
 * sitting on a hairline. Plain anchors, so Tab reaches them and Enter jumps.
 */
export function SectionTabs({ sections }: { sections: readonly SectionId[] }) {
  const t = useTranslations("school.tabs");
  return (
    <nav
      aria-label={t("label")}
      className="overflow-x-auto border-b border-hairline [scrollbar-width:thin]"
    >
      <ul className="m-0 flex list-none gap-1 p-0">
        {sections.map((id) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="inline-flex h-11 items-center whitespace-nowrap border-b-[3px] border-transparent px-3 text-base text-fg-secondary no-underline transition-colors hover:border-border hover:text-fg hover:no-underline"
            >
              {t(id)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
