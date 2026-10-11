import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import { Button } from "./button";
import { Popover } from "./popover";
import { renderWithIntl } from "./test-utils";

function Example() {
  return (
    <Popover trigger={<Button variant="text">About these results</Button>} label="About">
      <p>Directory data from the California Department of Education.</p>
      <Button variant="secondary" size="sm">
        Sources
      </Button>
    </Popover>
  );
}

describe("Popover", () => {
  it("opens from the keyboard, moves focus in, and closes on Escape", async () => {
    const { baseElement } = renderWithIntl(<Example />);
    const trigger = screen.getByRole("button", { name: "About these results" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const panel = await screen.findByRole("dialog", { name: "About" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel).toContainElement(document.activeElement as HTMLElement);
    expect(await runAxe(baseElement)).toHaveNoViolations();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    renderWithIntl(
      <>
        <Example />
        <p>Elsewhere</p>
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "About these results" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Elsewhere"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
