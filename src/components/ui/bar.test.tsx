import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import { Bar } from "./bar";

describe("Bar", () => {
  it("renders label and value as text and the bar as decoration", async () => {
    const { container } = render(<Bar label="ELA · this school" value={61} valueLabel="61%" />);
    expect(screen.getByText("ELA · this school")).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
    const fill = container.querySelector("[aria-hidden='true'] > span") as HTMLElement;
    expect(fill.style.width).toBe("61%");
    expect(fill).toHaveClass("bg-bar-primary");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("clamps the fill and uses the secondary tone for comparisons", () => {
    const { container } = render(
      <Bar label="California" value={140} max={100} valueLabel="140%" tone="secondary" />,
    );
    const fill = container.querySelector("[aria-hidden='true'] > span") as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(fill).toHaveClass("bg-bar-secondary");
  });
});
