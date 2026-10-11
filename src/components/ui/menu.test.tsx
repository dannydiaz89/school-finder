import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { Menu } from "./menu";
import { renderWithIntl } from "./test-utils";

const typeOptions = [
  { value: "district", label: "District · public" },
  { value: "charter", label: "Charter · public" },
  { value: "private", label: "Private" },
];

const sortOptions = [
  { value: "distance", label: "Distance" },
  { value: "ela", label: "ELA performance" },
];

describe("Menu", () => {
  it("opens a labelled panel of checkboxes and applies the draft in option order", async () => {
    const onApply = vi.fn();
    const { baseElement } = renderWithIntl(
      <Menu
        mode="multiple"
        label="Type: District, Charter"
        groupLabel="School type"
        options={typeOptions}
        value={["district", "charter"]}
        onApply={onApply}
        active
      />,
    );
    const trigger = screen.getByRole("button", { name: "Type: District, Charter" });
    expect(trigger).toHaveClass("border-accent");

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "School type" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "School type" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "District · public" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Private" })).not.toBeChecked();
    expect(await runAxe(baseElement)).toHaveNoViolations();

    // Uncheck District, check Private, then Apply with the keyboard.
    await userEvent.click(screen.getByRole("checkbox", { name: "District · public" }));
    const privateBox = screen.getByRole("checkbox", { name: "Private" });
    privateBox.focus();
    await userEvent.keyboard(" ");
    expect(privateBox).toBeChecked();
    screen.getByRole("button", { name: "Apply" }).focus();
    await userEvent.keyboard("{Enter}");

    expect(onApply).toHaveBeenCalledWith(["charter", "private"]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("discards the draft on Cancel and on Escape", async () => {
    const onApply = vi.fn();
    renderWithIntl(
      <Menu
        mode="multiple"
        label="Type"
        groupLabel="School type"
        options={typeOptions}
        value={["district"]}
        onApply={onApply}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Type" });

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("checkbox", { name: "Private" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    const privateBox = await screen.findByRole("checkbox", { name: "Private" });
    expect(privateBox).not.toBeChecked();
    await userEvent.click(privateBox);
    await userEvent.keyboard("{Escape}");
    expect(onApply).not.toHaveBeenCalled();

    await userEvent.click(trigger);
    expect(await screen.findByRole("checkbox", { name: "Private" })).not.toBeChecked();
  });

  it("renders radio items in single mode and applies one value", async () => {
    const onApply = vi.fn();
    const { baseElement } = renderWithIntl(
      <Menu
        mode="single"
        label="Sort: Distance"
        groupLabel="Sort by"
        options={sortOptions}
        value="distance"
        onApply={onApply}
        align="end"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sort: Distance" }));
    const distance = await screen.findByRole("radio", { name: "Distance" });
    expect(distance).toBeChecked();
    expect(await runAxe(baseElement)).toHaveNoViolations();

    distance.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "ELA performance" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith("ela");
  });
});
