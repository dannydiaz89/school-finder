import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import { EmptyState } from "./empty-state";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology", async () => {
    const { container } = render(<Skeleton lines={3} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.children).toHaveLength(3);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("renders one bar with the given size class", () => {
    const { container } = render(<Skeleton className="h-5 w-48" />);
    expect(container.firstElementChild).toHaveClass("h-5", "w-48", "animate-pulse");
  });
});

describe("EmptyState", () => {
  it("renders title, body, and action", async () => {
    const { container } = render(
      <EmptyState
        title="No schools match"
        body="Try a larger radius or fewer filters."
        action={<button type="button">Reset filters</button>}
        titleAs="h2"
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "No schools match" })).toBeInTheDocument();
    expect(screen.getByText("Try a larger radius or fewer filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("defaults the title to plain text so it does not break the outline", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing here").tagName).toBe("P");
  });
});
