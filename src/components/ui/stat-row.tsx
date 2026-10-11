import type { ReactNode } from "react";
import { cx } from "./cx";

export interface Stat {
  /** Stable key for React. */
  key: string;
  /** The big number, already formatted: "412", "22:1", "38%". */
  value: ReactNode;
  /** Small gray label under it. */
  label: ReactNode;
}

export interface StatRowProps {
  /** Up to four. */
  stats: Stat[];
  className?: string;
}

/**
 * A row of big numbers with small gray labels, separated by vertical
 * hairlines. Two columns on phones, one row from `sm` up. Rendered as a
 * <dl> so the label describes the number.
 */
export function StatRow({ stats, className }: StatRowProps) {
  return (
    <dl
      className={cx(
        "m-0 -ml-4 grid grid-cols-2 gap-y-4 border-b border-hairline py-[18px] sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none",
        className,
      )}
    >
      {stats.slice(0, 4).map((stat) => (
        <div
          key={stat.key}
          className="flex flex-col-reverse gap-0.5 border-hairline px-4 [&:nth-child(even)]:border-l sm:[&:not(:first-child)]:border-l"
        >
          <dd className="m-0 text-4xl leading-tight text-fg">{stat.value}</dd>
          <dt className="text-sm text-fg-muted">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}
