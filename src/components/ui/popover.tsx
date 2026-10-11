"use client";

import { Popover as RadixPopover } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { cx } from "./cx";

/** Surface styles shared by anything that floats: popovers, menus. The only place a shadow is allowed. */
export const popoverSurface =
  "z-20 rounded-md border border-border bg-bg-raised text-fg shadow-popover outline-none";

export interface PopoverProps {
  /** The element that opens the popover; must accept a ref and button props (Button, FilterButton). */
  trigger: ReactElement;
  children: ReactNode;
  /** Accessible name for the floating panel. */
  label?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render in a portal (default). Pass `false` to keep it inside a themed ancestor, as the styleguide does. */
  portal?: boolean;
  /** Class for the floating panel. Defaults include 16px padding; pass `p-0` for menus. */
  className?: string;
}

/**
 * Radix Popover with the design's surface. Escape closes it, outside clicks
 * close it, focus moves in on open and back to the trigger on close.
 */
export function Popover({
  trigger,
  children,
  label,
  align = "start",
  side = "bottom",
  open,
  defaultOpen,
  onOpenChange,
  portal = true,
  className,
}: PopoverProps) {
  const content = (
    <RadixPopover.Content
      align={align}
      side={side}
      sideOffset={6}
      collisionPadding={16}
      aria-label={label}
      className={cx(popoverSurface, "min-w-[200px] max-w-[calc(100vw-32px)] p-4", className)}
    >
      {children}
    </RadixPopover.Content>
  );
  return (
    <RadixPopover.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      {portal ? <RadixPopover.Portal>{content}</RadixPopover.Portal> : content}
    </RadixPopover.Root>
  );
}

/** Wrap a button with `asChild` to close the nearest Popover. */
export const PopoverClose = RadixPopover.Close;
