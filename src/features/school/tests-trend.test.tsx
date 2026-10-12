import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadDetail } from "./fixtures.test-helpers";
import { TestsTrend } from "./tests-trend";

function tableTexts() {
  return within(screen.getByRole("table", { name: "By year" }))
    .getAllByRole("row")
    .map((row) => Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent?.trim()));
}

describe("TestsTrend", () => {
  it("shows the share meeting or exceeding standard for every year on file", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(<TestsTrend rows={detail.history.caaspp} />);
    // Judah: ELA 61.97, 65.61, 62.73; Math 56.54, 55.66, 57.01.
    expect(tableTexts()).toEqual([
      ["Subject", "2022-23", "2023-24", "2024-25"],
      ["English Language Arts", "62%", "66%", "63%"],
      ["Mathematics", "57%", "56%", "57%"],
    ]);
    expect(
      screen.getByText("This school, all grades tested · students meeting or exceeding standard"),
    ).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("says Not tested for a year with no result", async () => {
    const detail = await loadDetail(CDS.judah);
    const rows = detail.history.caaspp.filter(
      (r) => !(r.subject === "math" && r.year === "2022-23"),
    );
    renderWithIntl(<TestsTrend rows={rows} />);
    expect(tableTexts()[2]).toEqual(["Mathematics", "Not tested", "56%", "57%"]);
  });

  it("renders nothing with a single year", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(
      <TestsTrend rows={detail.caaspp.filter((r) => r.grade === "all")} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
