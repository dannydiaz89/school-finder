"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copies the current address (which holds the whole compare list) to the
 * clipboard and announces the result in a polite live region, so screen
 * reader users hear "Link copied" without focus moving.
 */
export function CopyLinkButton({ className }: { className?: string }) {
  const t = useTranslations("compare");
  const common = useTranslations("common");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    // Reset first so a repeat click re-announces the same message.
    setStatus("idle");
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <span className={["inline-flex items-center gap-3", className].filter(Boolean).join(" ")}>
      <Button variant="text" size="sm" onClick={copy}>
        {common("actions.copyLink")}
      </Button>
      <span role="status" aria-live="polite" className="text-sm text-fg-muted">
        {status === "copied" ? t("copied") : status === "failed" ? t("copyFailed") : null}
      </span>
    </span>
  );
}
