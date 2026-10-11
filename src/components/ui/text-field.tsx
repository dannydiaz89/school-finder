import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import { describedBy, Field } from "./field";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  hint?: string;
  /** Shown under the field and announced through `aria-describedby`; sets `aria-invalid`. */
  error?: string;
  /** Decorative icon inside the field, before the text. Pass an `aria-hidden` SVG. */
  leadingIcon?: ReactNode;
  /** Class for the outer wrapper. `className` goes to the input. */
  wrapperClassName?: string;
}

/**
 * A labelled single-line text input. 44px tall, hairline border, token
 * colors in both themes. Hint and error are wired to the input for
 * screen readers.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel, hint, error, leadingIcon, wrapperClassName, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <Field
      id={inputId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 inline-flex text-fg-muted">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type="text"
          aria-describedby={describedBy(inputId, hint, error)}
          aria-invalid={error ? true : undefined}
          className={cx(
            "h-11 w-full min-w-0 rounded-md border bg-bg px-3 text-base text-fg placeholder:text-fg-muted",
            "hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-border-strong" : "border-border",
            leadingIcon ? "pl-10" : null,
            className,
          )}
          {...rest}
        />
      </div>
    </Field>
  );
});
