import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { Checkbox } from "./checkbox";
import { Radio } from "./radio";

describe("Checkbox", () => {
  it("is a labelled native checkbox", async () => {
    const { container } = render(
      <Checkbox label="Private" description="Files an affidavit" defaultChecked />,
    );
    const box = screen.getByRole("checkbox", { name: /Private/ });
    expect(box).toBeChecked();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("toggles with Space and when the label text is clicked", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Charter" onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Charter" });
    box.focus();
    await userEvent.keyboard(" ");
    expect(box).toBeChecked();
    await userEvent.click(screen.getByText("Charter"));
    expect(box).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does not toggle when disabled", async () => {
    render(<Checkbox label="District" disabled />);
    await userEvent.click(screen.getByText("District"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});

describe("Radio", () => {
  it("selects one of a named group with the arrow keys", async () => {
    const { container } = render(
      <fieldset>
        <legend>Sort</legend>
        <Radio name="sort" value="distance" label="Distance" defaultChecked />
        <Radio name="sort" value="ela" label="ELA" />
      </fieldset>,
    );
    const first = screen.getByRole("radio", { name: "Distance" });
    first.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "ELA" })).toBeChecked();
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
