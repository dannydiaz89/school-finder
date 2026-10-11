import { cx } from "./cx";

export interface CaretProps {
  /** Points down by default; `up` for an open disclosure if the design wants it. */
  direction?: "down" | "up";
  className?: string;
}

/** Small triangle used after text buttons that open a menu. Decorative. */
export function Caret({ direction = "down", className }: CaretProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cx("shrink-0 fill-current", className)}
    >
      {direction === "down" ? <path d="M7 10l5 5 5-5z" /> : <path d="M7 14l5-5 5 5z" />}
    </svg>
  );
}
