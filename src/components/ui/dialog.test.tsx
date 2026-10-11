import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Dialog, DialogClose } from "./dialog";
import { renderWithIntl } from "./test-utils";

function Example({ onApply }: { onApply?: () => void }) {
  return (
    <Dialog
      trigger={<Button variant="secondary">Filters</Button>}
      title="Filters"
      description="Narrow the list."
      footer={
        <DialogClose asChild>
          <Button variant="primary" onClick={onApply}>
            Apply
          </Button>
        </DialogClose>
      }
    >
      <Checkbox label="Private" />
    </Dialog>
  );
}

describe("Dialog", () => {
  // Radix sets pointer-events: none on the body while a modal is open.
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  it("is a labelled modal dialog that traps focus and closes on Escape", async () => {
    const { baseElement } = renderWithIntl(<Example />);
    const trigger = screen.getByRole("button", { name: "Filters" });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Filters" });
    expect(dialog).toHaveAccessibleDescription("Narrow the list.");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(await runAxe(baseElement)).toHaveNoViolations();

    // Tab cycles inside the dialog: Close, checkbox, Apply, then back to Close.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes from the Close button and from a DialogClose in the footer", async () => {
    const onApply = vi.fn();
    renderWithIntl(<Example onApply={onApply} />);
    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(await screen.findByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
