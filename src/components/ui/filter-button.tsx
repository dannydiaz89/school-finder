import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Caret } from "./caret";
import { cx } from "./cx";

export interface FilterButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The filter is narrowing results: accent text and a 3px accent underline. */
  active?: boolean;
  /** Show the caret; on for anything that opens a menu. */
  caret?: boolean;
}

/**
 * Text tab for the filter row: 44px tall, gray by default, accent with an
 * underline when active or open (Radix sets `data-state="open"`).
 */
export const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(function FilterButton(
  { active, caret, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap border-b-[3px] px-3 text-base transition-colors",
        "data-[state=open]:border-accent data-[state=open]:text-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-accent font-medium text-accent"
          : "border-transparent text-fg-secondary hover:text-fg",
        className,
      )}
      {...rest}
    >
      {children}
      {caret ? <Caret /> : null}
    </button>
  );
});
