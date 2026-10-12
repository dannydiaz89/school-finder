import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cx } from "./cx";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Minimum table width in px; below it the wrapper scrolls sideways. */
  minWidth?: number;
  /** Class for the scrolling wrapper. `className` goes to the table. */
  wrapperClassName?: string;
}

/**
 * Plain data table: no outer border, hairline rows, bold only for the
 * best value in a row. Wrapped in an `overflow-x-auto` box so wide
 * compare tables scroll on phones instead of breaking the page.
 */
export function Table({ minWidth, wrapperClassName, className, style, ...rest }: TableProps) {
  return (
    <div className={cx("w-full overflow-x-auto", wrapperClassName)}>
      <table
        className={cx("w-full border-collapse text-left text-base text-fg", className)}
        style={minWidth ? { minWidth, ...style } : style}
        {...rest}
      />
    </div>
  );
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Column-header rows get the stronger `border` line under them. */
  header?: boolean;
}

export function TableRow({ header, className, ...rest }: TableRowProps) {
  return (
    <tr
      className={cx(
        "align-top",
        header ? "border-b border-border" : "border-t border-hairline last:border-b",
        className,
      )}
      {...rest}
    />
  );
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** `col` for the top row, `row` for the gray label at the start of a data row. */
  scope?: "col" | "row";
}

export function TableHeaderCell({ scope = "col", className, ...rest }: TableHeaderCellProps) {
  return (
    <th
      scope={scope}
      className={cx(
        "py-2.5 pr-3 text-left font-normal last:pr-0",
        scope === "row" ? "text-fg-muted" : "text-fg",
        className,
      )}
      {...rest}
    />
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Bold: the best value in the row. */
  emphasis?: boolean;
  /** What the emphasis means, for screen readers, e.g. "best in this row". */
  emphasisLabel?: string;
  /** Gray: "Not rated", "Not reported", or no data. */
  muted?: boolean;
}

export function TableCell({
  emphasis,
  emphasisLabel,
  muted,
  className,
  children,
  ...rest
}: TableCellProps) {
  return (
    <td className={cx("py-2.5 pr-3 last:pr-0", muted && "text-fg-muted", className)} {...rest}>
      {emphasis ? (
        // A highlighter mark around the content: tinted, bold, and named for screen readers,
        // so the emphasis never depends on color or weight alone.
        <mark className="-mx-1.5 inline-block rounded-sm bg-accent-subtle px-1.5 py-0.5 font-bold text-inherit">
          {children}
          {emphasisLabel ? <span className="sr-only"> ({emphasisLabel})</span> : null}
        </mark>
      ) : (
        children
      )}
    </td>
  );
}

export interface TableGroupRowProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Number of columns the group header spans. */
  colSpan: number;
}

/** A section heading inside the table body, spanning every column. */
export function TableGroupRow({ colSpan, className, children, ...rest }: TableGroupRowProps) {
  return (
    <tr>
      <th
        scope="colgroup"
        colSpan={colSpan}
        className={cx("pb-1.5 pt-5 text-left text-md font-medium text-fg", className)}
        {...rest}
      >
        {children}
      </th>
    </tr>
  );
}
