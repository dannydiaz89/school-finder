import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import { StatRow } from "./stat-row";

describe("StatRow", () => {
  it("renders a definition list of numbers and labels", async () => {
    const { container } = render(
      <StatRow
        stats={[
          { key: "enrollment", value: "412", label: "Students, 2024–25" },
          { key: "ratio", value: "22:1", label: "Student–teacher" },
          { key: "frpm", value: "38%", label: "Free / reduced meals" },
          { key: "el", value: "9%", label: "English learners" },
        ]}
      />,
    );
    expect(screen.getAllByRole("term")).toHaveLength(4);
    expect(screen.getAllByRole("definition")).toHaveLength(4);
    expect(screen.getByText("22:1")).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("drops anything past the fourth stat", () => {
    render(
      <StatRow
        stats={Array.from({ length: 6 }, (_, i) => ({
          key: String(i),
          value: String(i),
          label: `Stat ${i}`,
        }))}
      />,
    );
    expect(screen.getAllByRole("term")).toHaveLength(4);
  });
});
