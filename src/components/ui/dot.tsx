import { cx } from "./cx";

export interface DotProps {
  /** `sm` is 8px (school types), `md` is 10px (Dashboard levels). */
  size?: "sm" | "md";
  /** A token background utility such as `bg-level-green` or `bg-type-charter`. */
  className?: string;
}

/**
 * The colored dot that sits before a category word. Always decorative: the
 * word next to it carries the meaning.
 */
export function Dot({ size = "sm", className }: DotProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-block shrink-0 rounded-full",
        size === "sm" ? "size-2" : "size-2.5",
        className,
      )}
    />
  );
}
