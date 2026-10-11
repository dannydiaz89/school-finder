import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { TextField } from "./text-field";

describe("TextField", () => {
  it("labels the input and wires hint and error for screen readers", async () => {
    const { container } = render(
      <TextField label="Home address" hint="Street, city" error="Add the city" />,
    );
    const input = screen.getByRole("textbox", { name: "Home address" });
    expect(input).toHaveAccessibleDescription("Street, city Add the city");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("keeps a hidden label accessible and renders the leading icon as decoration", async () => {
    const { container } = render(
      <TextField
        label="Home address"
        hideLabel
        placeholder="Street address, city, CA"
        leadingIcon={<svg data-testid="icon" aria-hidden="true" />}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Home address" })).toHaveAttribute(
      "placeholder",
      "Street address, city, CA",
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("accepts typing and reports changes", async () => {
    const onChange = vi.fn();
    render(<TextField label="Home address" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Home address" }), "1420 J");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("1420 J");
  });
});
