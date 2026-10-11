import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import { FilterButton } from "./filter-button";

export interface FilterBarProps {
  /** Visible gray word at the start of the row ("Filters"); also names the group. */
  label: string;
  /** Menu triggers and FilterButtons. */
  children: ReactNode;
  /** When given, a "Reset" text button follows the filters. */
  onReset?: () => void;
  resetDisabled?: boolean;
  /** Right-aligned slot, usually a Menu with radio items for sort order. */
  sort?: ReactNode;
  className?: string;
}

/**
 * The row of filter tabs sitting on a hairline. Scrolls sideways on phones
 * instead of wrapping, so the row stays one line like the mockup.
 */
export function FilterBar({
  label,
  children,
  onReset,
  resetDisabled,
  sort,
  className,
}: FilterBarProps) {
  const t = useTranslations("common.actions");
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cx(
        "flex items-end gap-1 overflow-x-auto border-b border-hairline [scrollbar-width:thin]",
        className,
      )}
    >
      <span
        id={labelId}
        className="inline-flex h-11 shrink-0 items-center pr-2 text-base text-fg-muted"
      >
        {label}
      </span>
      {children}
      {onReset ? (
        <FilterButton onClick={onReset} disabled={resetDisabled}>
          {t("reset")}
        </FilterButton>
      ) : null}
      {sort ? <div className="ml-auto flex shrink-0 items-end pl-3">{sort}</div> : null}
    </div>
  );
}
