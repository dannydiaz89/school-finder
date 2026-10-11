import type { ComponentPropsWithoutRef, ElementType } from "react";

type Props<T extends ElementType = "span"> = { as?: T } & ComponentPropsWithoutRef<T>;

/**
 * Renders content for screen readers only. Use for labels on icon-only
 * controls and for context that sighted users get from layout.
 */
export function VisuallyHidden<T extends ElementType = "span">({
  as,
  className,
  ...rest
}: Props<T>) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag
      className={[
        "absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0,0,0,0)] [clip-path:inset(50%)] border-0 p-0 -m-px",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
