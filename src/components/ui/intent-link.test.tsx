import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { renderWithIntl } from "./test-utils";

const seen: unknown[] = [];
vi.mock("@/i18n/navigation", () => ({
  Link: ({ prefetch, children, ...rest }: { prefetch?: unknown; children: React.ReactNode }) => {
    seen.push(prefetch);
    return <a {...(rest as object)}>{children}</a>;
  },
}));

import { IntentLink } from "./intent-link";

describe("IntentLink", () => {
  it("prefetches only the shell until the visitor shows intent, then the full page", async () => {
    seen.length = 0;
    const { container } = renderWithIntl(<IntentLink href="/compare">Compare</IntentLink>);
    expect(seen.at(-1)).toBe("auto");
    await userEvent.hover(screen.getByRole("link", { name: "Compare" }));
    expect(seen.at(-1)).toBe(true);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("treats keyboard focus as intent", async () => {
    seen.length = 0;
    renderWithIntl(<IntentLink href="/compare">Compare</IntentLink>);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Compare" })).toHaveFocus();
    expect(seen.at(-1)).toBe(true);
  });
});
