"use client";

import { useTranslations } from "next-intl";
import { Dialog as RadixDialog } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";

export interface DialogProps {
  /** Optional opener; omit when the dialog is controlled from elsewhere. */
  trigger?: ReactElement;
  title: string;
  /** One line under the title, announced with the dialog. */
  description?: string;
  children: ReactNode;
  /** Actions at the bottom: usually Cancel (text) and Apply (primary). */
  footer?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Class for the dialog panel. */
  className?: string;
}

/**
 * Modal dialog on Radix: focus is trapped, Escape and the overlay close it,
 * focus returns to the trigger. A bottom sheet on phones and a centered
 * panel from `sm` up, which is what the filter sheet needs.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
  open,
  defaultOpen,
  onOpenChange,
  className,
}: DialogProps) {
  const t = useTranslations("common.actions");
  return (
    <RadixDialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-30 bg-fg/40" />
        <RadixDialog.Content
          // Without a Description, Radix wants an explicit undefined to stay quiet.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cx(
            "fixed z-30 flex max-h-[85vh] flex-col border border-border bg-bg-raised text-fg outline-none",
            "inset-x-0 bottom-0 rounded-t-lg",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(480px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-4">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="m-0 text-xl font-medium">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="m-0 text-sm text-fg-muted">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <Button variant="text" className="h-11 shrink-0">
                {t("close")}
              </Button>
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {footer ? (
            <div className="flex justify-end gap-2 border-t border-hairline px-5 py-3">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Wrap a button with `asChild` to close the nearest Dialog, e.g. an Apply button. */
export const DialogClose = RadixDialog.Close;
