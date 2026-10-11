import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadDetail } from "./fixtures.test-helpers";
import { TestsSection } from "./tests-section";

describe("TestsSection", () => {
  it("compares the school with its district and California for ELA and Math", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(
      <TestsSection cds={detail.school.cds} comparison={detail.caasppComparison} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Test scores" })).toBeInTheDocument();
    expect(
      screen.getByText("CAASPP 2024-25 · students meeting or exceeding standard"),
    ).toBeInTheDocument();
    expect(screen.getByText("ELA · this school").nextElementSibling).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    // Judah 62.73 / district / state 48.81 for ELA; Math 57.01 / district / state 37.3.
    expect(screen.getByText("ELA · this school").parentElement).toHaveTextContent("63%");
    expect(screen.getByText("Math · this school").parentElement).toHaveTextContent("57%");
    const states = screen.getAllByText("California");
    expect(states[0].parentElement).toHaveTextContent("49%");
    expect(states[1].parentElement).toHaveTextContent("37%");
    expect(screen.getByRole("link", { name: /CAASPP site/ })).toHaveAttribute(
      "href",
      "https://caaspp-elpac.ets.org/caaspp/DashViewReportSB?ps=true&lstTestYear=2025&lstTestType=B&lstGroup=1&lstSchoolType=A&lstCounty=34&lstDistrict=67439&lstSchool=6034292",
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("says when no results are published", async () => {
    const detail = await loadDetail(CDS.judah);
    renderWithIntl(<TestsSection cds={detail.school.cds} comparison={null} />);
    expect(screen.getByText(/No CAASPP results are published/)).toBeInTheDocument();
  });
});
