import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { DashboardSection, dashboardYear } from "./dashboard-section";
import { CDS, loadDetail } from "./fixtures.test-helpers";

function rowTexts() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent?.trim()));
}

describe("DashboardSection", () => {
  it("lists each published indicator with level, status, and change", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(
      <DashboardSection school={detail.school} rows={detail.dashboard} />,
    );
    expect(dashboardYear(detail.dashboard)).toBe(2025);
    expect(
      screen.getByRole("heading", { level: 2, name: "California School Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2025 · five levels, Blue is highest")).toBeInTheDocument();
    expect(rowTexts()).toEqual([
      ["English Language Arts", "Green", "31.5 pts above standard", "Increased 3.6"],
      ["Mathematics", "Green", "5.8 pts above standard", "Maintained"],
      ["Chronic absenteeism", "Orange", "19.3% chronically absent", "Increased 1.6"],
      ["Suspension rate", "Green", "0.6% suspended at least once", "Maintained"],
      ["Science", "Blue", "65.5% met or exceeded standard", "Increased 10.1"],
    ]);
    // K–6: no graduation or College/Career rows, and the note says why.
    expect(
      screen.getByText(/Graduation rate and College\/Career do not apply/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/fewer than 30 students/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Full report/ })).toHaveAttribute(
      "href",
      "https://www.caschooldashboard.org/reports/34674396034292/2025",
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows No level with the small-count note, below-standard points, and declines", async () => {
    const detail = await loadDetail(CDS.legion);
    renderWithIntl(<DashboardSection school={detail.school} rows={detail.dashboard} />);
    const rows = rowTexts();
    expect(rows[0]).toEqual([
      "English Language Arts",
      "No level",
      "145.7 pts below standard",
      "Declined 6",
    ]);
    expect(rows.find((r) => r[0] === "Suspension rate")).toEqual([
      "Suspension rate",
      "Yellow",
      "10.5% suspended at least once",
      "Declined 3.2",
    ]);
    expect(screen.getByText(/fewer than 30 students/)).toBeInTheDocument();
    // Grades 10–12 include 12, so the grade-span note does not appear.
    expect(screen.queryByText(/do not apply/)).not.toBeInTheDocument();
  });

  it("says when nothing is published", async () => {
    const detail = await loadDetail(CDS.judah);
    renderWithIntl(<DashboardSection school={detail.school} rows={[]} />);
    expect(screen.getByText(/No Dashboard indicators are published/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
