import type { CSSProperties, ReactNode } from "react";
import { cx } from "./cx";

export interface BarProps {
  /** Row label, left of the bar. */
  label: ReactNode;
  /** Fill amount, from 0 to `max`. */
  value: number;
  max?: number;
  /** The visible, accessible value: "61%". The bar itself is decorative. */
  valueLabel: string;
  /** `primary` for the subject, `secondary` for comparison rows (district, state). */
  tone?: "primary" | "secondary";
  /** Bold the value, for the subject row. */
  emphasis?: boolean;
  /** Width of the label column so stacked bars align. Any CSS length. */
  labelWidth?: string;
  className?: string;
}

/**
 * Thin 8px comparison bar: label, track with fill, value text. Stack
 * several with the same `labelWidth` to compare a school with its
 * district and the state.
 */
export function Bar({
  label,
  value,
  max = 100,
  valueLabel,
  tone = "primary",
  emphasis,
  labelWidth = "8rem",
  className,
}: BarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const style = { "--bar-label": labelWidth } as CSSProperties;
  return (
    <div
      style={style}
      className={cx(
        "grid grid-cols-[var(--bar-label)_minmax(0,1fr)_auto] items-center gap-3 text-base",
        tone === "secondary" ? "text-fg-secondary" : "text-fg",
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span aria-hidden="true" className="block h-2 overflow-hidden rounded-sm bg-bar-track">
        <span
          className={cx(
            "block h-full rounded-sm",
            tone === "secondary" ? "bg-bar-secondary" : "bg-bar-primary",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span className={cx("min-w-[3ch] text-right tabular-nums", emphasis && "font-medium")}>
        {valueLabel}
      </span>
    </div>
  );
}
