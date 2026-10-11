import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cx } from "./cx";

export interface KeyValueItem {
  /** Stable key for React. */
  key: string;
  label: ReactNode;
  value: ReactNode;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  /** Width of the label column. Any CSS length. */
  labelWidth?: string;
  className?: string;
}

/**
 * Two-column <dl>: gray labels on the left, values on the right, a
 * hairline under each row. Used for directory facts.
 */
export function KeyValueList({ items, labelWidth = "8rem", className }: KeyValueListProps) {
  const style = { "--kv-label": labelWidth } as CSSProperties;
  return (
    <dl
      style={style}
      className={cx(
        "m-0 grid grid-cols-[var(--kv-label)_minmax(0,1fr)] gap-x-3 text-base",
        className,
      )}
    >
      {items.map((item) => (
        <Fragment key={item.key}>
          <dt className="border-b border-hairline py-3 text-fg-muted">{item.label}</dt>
          <dd className="m-0 min-w-0 border-b border-hairline py-3 text-fg">{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
