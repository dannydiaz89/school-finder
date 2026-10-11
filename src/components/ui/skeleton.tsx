import { cx } from "./cx";

export interface SkeletonProps {
  /** Number of text-like bars to stack. One bar fills the width you give it. */
  lines?: number;
  /** Size the single bar: `h-5 w-48`. Applies to the wrapper when `lines` is more than one. */
  className?: string;
}

const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3"];

/**
 * Placeholder for content that is loading. Hidden from assistive
 * technology; the surrounding region should announce loading itself.
 * The pulse stops under `prefers-reduced-motion` through the global rule.
 */
export function Skeleton({ lines = 1, className }: SkeletonProps) {
  if (lines <= 1) {
    return (
      <span
        aria-hidden="true"
        className={cx("block h-3.5 animate-pulse rounded-sm bg-bg-map", className)}
      />
    );
  }
  return (
    <span aria-hidden="true" className={cx("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className={cx(
            "block h-3.5 animate-pulse rounded-sm bg-bg-map",
            widths[i % widths.length],
          )}
        />
      ))}
    </span>
  );
}
