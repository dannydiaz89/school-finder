import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { Caret } from "./caret";
import { cx } from "./cx";
import { describedBy, Field } from "./field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  options: SelectOption[];
  /** Class for the outer wrapper. `className` goes to the select. */
  wrapperClassName?: string;
}

/**
 * A labelled native <select>. The browser's own listbox is the most
 * accessible one there is; we only style the closed control.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel, hint, error, options, wrapperClassName, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <Field
      id={selectId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          aria-describedby={describedBy(selectId, hint, error)}
          aria-invalid={error ? true : undefined}
          className={cx(
            "h-11 w-full min-w-0 cursor-pointer appearance-none rounded-md border bg-bg pl-3 pr-9 text-base text-fg",
            "hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-border-strong" : "border-border",
            className,
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Caret className="pointer-events-none absolute right-3 text-fg-secondary" />
      </div>
    </Field>
  );
});
