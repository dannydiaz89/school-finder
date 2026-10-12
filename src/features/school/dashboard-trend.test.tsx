import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { DashboardTrend } from "./dashboard-trend";
import { CDS, loadDetail } from "./fixtures.test-helpers";

/** The pieces of text in a cell, in reading order: "Green | 20.2 pts above". */
function pieces(cell: Element): string {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  const out: string[] = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent?.trim();
    if (text) out.push(text);
  }
  return out.join(" | ");
}

function tableTexts() {
  const table = screen.getByRole("table", { name: "By year" });
  return within(table)
    .getAllByRole("row")
    .map((row) => Array.from(row.querySelectorAll("th, td"), pieces));
}

describe("DashboardTrend", () => {
  it("shows each indicator's level and status for every year on file", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(<DashboardTrend rows={detail.history.dashboard} />);
    expect(screen.getByRole("heading", { level: 3, name: "By year" })).toBeInTheDocument();
    expect(tableTexts()).toEqual([
      ["Indicator", "2023", "2024", "2025"],
      [
        "English Language Arts",
        "Green | 20.2 pts above",
        "Green | 28 pts above",
        "Green | 31.5 pts above",
      ],
      ["Mathematics", "Yellow | 2.1 pts below", "Green | 3.4 pts above", "Green | 5.8 pts above"],
      ["Chronic absenteeism", "Orange | 23.6%", "Yellow | 17.7%", "Orange | 19.3%"],
      ["Suspension rate", "Orange | 2.2%", "Blue | 0.4%", "Green | 0.6%"],
      // Fewer than 30 English learners each year: a status, but no level.
      ["English learner progress", "No level | 21.1%", "No level | 36.4%", "No level | 62.5%"],
      // No science file in 2023: a dash for the eye, "Not reported" for screen readers.
      // Science was points from standard in 2024 and a percent in 2025.
      ["Science", "— | Not reported", "No level | 8.6 pts below", "Blue | 65.5%"],
    ]);
    expect(
      screen.getByText(/No level in an earlier year: fewer than 30 students/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Science had no color before 2025 and was reported as points/),
    ).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("keeps the science note out when science has one unit", async () => {
    const detail = await loadDetail(CDS.judah);
    renderWithIntl(
      <DashboardTrend rows={detail.history.dashboard.filter((r) => r.indicator !== "science")} />,
    );
    expect(screen.queryByText(/not comparable/)).not.toBeInTheDocument();
  });

  it("explains a missing level only when an earlier year has one", async () => {
    const detail = await loadDetail(CDS.judah);
    const rated = detail.history.dashboard.filter(
      (r) => r.indicator === "ela" || r.indicator === "math",
    );
    renderWithIntl(<DashboardTrend rows={rated} />);
    expect(screen.queryByText(/No level in an earlier year/)).not.toBeInTheDocument();
  });

  it("says Not reported where the state published neither a color nor a number", async () => {
    // Murphy Ranch Elementary: 4 English learners, suppressed every year.
    const detail = await loadDetail(CDS.judah);
    const rows = detail.history.dashboard.map((r) =>
      r.indicator === "elpi" && r.year === 2024 ? { ...r, level: null, status: null } : r,
    );
    renderWithIntl(<DashboardTrend rows={rows} />);
    expect(tableTexts()[5]).toEqual([
      "English learner progress",
      "No level | 21.1%",
      "Not reported",
      "No level | 62.5%",
    ]);
  });

  it("renders nothing with a single year or no rows", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(<DashboardTrend rows={detail.dashboard} />);
    expect(container).toBeEmptyDOMElement();
    const empty = renderWithIntl(<DashboardTrend rows={[]} />);
    expect(empty.container).toBeEmptyDOMElement();
  });
});
