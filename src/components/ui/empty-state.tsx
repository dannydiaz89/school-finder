import type { ReactNode } from "react";
import { cx } from "./cx";

export interface EmptyStateProps {
  title: string;
  body?: string;
  /** Usually a `Button variant="secondary"` or a `TextLink`. */
  action?: ReactNode;
  /** Heading element for the title. Pick the level that fits the page outline. */
  titleAs?: "h2" | "h3" | "p";
  className?: string;
}

/**
 * Quiet message for an empty list or a failed lookup: title, one line of
 * body, optional action. No illustration, no box.
 */
export function EmptyState({
  title,
  body,
  action,
  titleAs: Title = "p",
  className,
}: EmptyStateProps) {
  return (
    <div className={cx("flex max-w-[480px] flex-col items-start gap-2 py-6", className)}>
      <Title className="m-0 text-xl font-normal text-fg">{title}</Title>
      {body ? <p className="m-0 text-base text-fg-muted">{body}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
