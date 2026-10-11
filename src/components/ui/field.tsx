import type { ReactNode } from "react";
import { cx } from "./cx";

export interface FieldProps {
  /** The id of the control the label points at. */
  id: string;
  label: string;
  /** Keep the label for screen readers only, e.g. a search box with a placeholder. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

/** The `aria-describedby` value for a control with an optional hint and error. */
export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? hintId(id) : null, error ? errorId(id) : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/**
 * Label, control, hint, and error message stacked. Shared by TextField and
 * Select so every form control reads the same way.
 */
export function Field({ id, label, hideLabel, hint, error, className, children }: FieldProps) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-base text-fg-secondary"}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId(id)} className="m-0 text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId(id)} className="m-0 text-sm font-medium text-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
