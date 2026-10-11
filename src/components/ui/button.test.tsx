import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { runAxe } from "@/test/a11y";
import { Button } from "./button";

describe("Button", () => {
  it("renders a real button that defaults to type=button", async () => {
    const { container } = render(<Button>Apply</Button>);
    const button = screen.getByRole("button", { name: "Apply" });
    expect(button).toHaveAttribute("type", "button");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("fires onClick from the keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Apply</Button>);
    const button = screen.getByRole("button", { name: "Apply" });
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Apply
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
