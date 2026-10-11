import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { FilterBar } from "./filter-bar";
import { FilterButton } from "./filter-button";
import { renderWithIntl } from "./test-utils";

describe("FilterBar", () => {
  it("groups the filters under the label, with Reset and a sort slot", async () => {
    const onReset = vi.fn();
    const { container } = renderWithIntl(
      <FilterBar
        label="Filters"
        onReset={onReset}
        sort={<FilterButton caret>Sort: Distance</FilterButton>}
      >
        <FilterButton active caret>
          Type: District, Charter
        </FilterButton>
        <FilterButton caret>Grades</FilterButton>
      </FilterBar>,
    );
    const group = screen.getByRole("group", { name: "Filters" });
    expect(group).toHaveClass("overflow-x-auto");
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Type: District, Charter",
      "Grades",
      "Reset",
      "Sort: Distance",
    ]);
    expect(buttons[0]).toHaveClass("border-accent");
    expect(buttons[1]).toHaveClass("border-transparent");

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("omits Reset when there is nothing to reset", () => {
    renderWithIntl(
      <FilterBar label="Filters">
        <FilterButton>Programs</FilterButton>
      </FilterBar>,
    );
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
  });

  it("FilterButton is a real button that activates from the keyboard", async () => {
    const onClick = vi.fn();
    renderWithIntl(<FilterButton onClick={onClick}>Programs</FilterButton>);
    const button = screen.getByRole("button", { name: "Programs" });
    expect(button).toHaveAttribute("type", "button");
    button.focus();
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
