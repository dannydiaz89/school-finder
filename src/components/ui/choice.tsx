import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export interface ChoiceProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> {
  label: ReactNode;
  /** Smaller gray line under the label. */
  description?: ReactNode;
  /** Class for the row (the <label>). `inputClassName` goes to the input. */
  className?: string;
  inputClassName?: string;
}

interface InternalProps extends ChoiceProps {
  type: "checkbox" | "radio";
}

/**
 * One labelled checkbox or radio row. The whole row is the label, so the
 * target is at least 44px tall and clicking the text toggles the input.
 */
export const Choice = forwardRef<HTMLInputElement, InternalProps>(function Choice(
  { type, label, description, className, inputClassName, ...rest },
  ref,
) {
  return (
    <label
      className={cx(
        "flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-base text-fg",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={ref}
        type={type}
        className={cx("mt-0.5 size-4.5 shrink-0 cursor-pointer accent-accent", inputClassName)}
        {...rest}
      />
      <span className="flex flex-col">
        <span>{label}</span>
        {description ? <span className="text-sm text-fg-muted">{description}</span> : null}
      </span>
    </label>
  );
});
