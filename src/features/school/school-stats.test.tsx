import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadDetail } from "./fixtures.test-helpers";
import { SchoolStats } from "./school-stats";

describe("SchoolStats", () => {
  it("shows enrollment, ratio, meals, and English learners for a public school", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(<SchoolStats detail={detail} />);
    expect(screen.getByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((el) => el.textContent)).toEqual([
      "Students, 2024-25",
      // The ratio comes from the staffing file, which is a year behind enrollment.
      "Student–teacher, 2023-24",
      "Free / reduced meals, 2024-25",
      "English learners, 2024-25",
    ]);
    expect(screen.getAllByRole("definition").map((el) => el.textContent)).toEqual([
      "485",
      "22.4:1",
      "30%",
      "5%",
    ]);
    expect(screen.queryByText(/Not rated/)).not.toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows affidavit counts and the neutral rating line for a private school", async () => {
    const detail = await loadDetail(CDS.stFrancis);
    const { container } = renderWithIntl(<SchoolStats detail={detail} />);
    expect(screen.getAllByRole("definition").map((el) => el.textContent)).toEqual([
      "294",
      "15",
      "3",
    ]);
    expect(screen.getByText(/Not rated on the California School Dashboard/)).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
