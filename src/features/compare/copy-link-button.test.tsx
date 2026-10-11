import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CopyLinkButton } from "./copy-link-button";

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyLinkButton", () => {
  it("copies the current address and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const { container } = renderWithIntl(<CopyLinkButton />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toBeEmptyDOMElement();

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText("Link copied")).toBe(status);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("says so when the clipboard is unavailable", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    renderWithIntl(<CopyLinkButton />);
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText(/could not be copied/)).toBeInTheDocument();
  });
});
