import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { Select } from "./select";

const options = [
  { value: "distance", label: "Distance" },
  { value: "ela", label: "ELA performance" },
  { value: "math", label: "Math performance" },
];

describe("Select", () => {
  it("renders a labelled native select with the options", async () => {
    const { container } = render(
      <Select label="Sort" options={options} defaultValue="distance" hint="Applies to the list" />,
    );
    const select = screen.getByRole("combobox", { name: "Sort" });
    expect(select).toHaveValue("distance");
    expect(select).toHaveAccessibleDescription("Applies to the list");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("changes value from the keyboard", async () => {
    const onChange = vi.fn();
    render(<Select label="Sort" options={options} defaultValue="distance" onChange={onChange} />);
    const select = screen.getByRole("combobox", { name: "Sort" });
    await userEvent.selectOptions(select, "math");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(select).toHaveValue("math");
  });
});
