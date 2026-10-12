import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadDetail } from "./fixtures.test-helpers";
import { SchoolHeader } from "./school-header";
import { compareState } from "./test-stubs";

vi.mock("@/i18n/navigation", () => import("./test-stubs"));
vi.mock("@/features/compare/use-compare-list", () => import("./test-stubs"));

describe("SchoolHeader", () => {
  beforeEach(() => {
    compareState.list = [];
    compareState.isFull = false;
    compareState.toggle.mockClear();
  });

  it("renders the name, type line, and action links for a public school", async () => {
    const { school } = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(
      <SchoolHeader
        school={school}
        dashboardYear={2025}
        backHref={{ pathname: "/", query: { address: "1420 J St", lat: "38.5781" } }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Theodore Judah Elementary",
    );
    expect(
      screen.getByText("District · public · Elementary · Sacramento City Unified · TK–6"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute(
      "href",
      "/en/?address=1420+J+St&lat=38.5781",
    );
    expect(screen.getByRole("link", { name: /CA School Dashboard/ })).toHaveAttribute(
      "href",
      "https://www.caschooldashboard.org/reports/34674396034292/2025",
    );
    expect(screen.getByRole("link", { name: /Directions/ })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps/dir/?api=1&destination=3919%20McKinley"),
    );
    // The fixture has no website, so no Website link.
    expect(screen.queryByRole("link", { name: /^Website/ })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Add to compare" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(compareState.toggle).toHaveBeenCalledWith(school.cds);
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows the website and In compare list when the school is already listed", async () => {
    const { school } = await loadDetail(CDS.sacHigh);
    compareState.list = [school.cds];
    renderWithIntl(<SchoolHeader school={school} dashboardYear={2025} backHref="/" />);
    expect(screen.getByRole("link", { name: /^Website/ })).toHaveAttribute(
      "href",
      "https://www.sachigh.org",
    );
    expect(screen.getByRole("button", { name: "In compare list" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows affiliation and no Dashboard link for a private school", async () => {
    const privateSchool = (await loadDetail(CDS.stFrancis)).school;
    renderWithIntl(<SchoolHeader school={privateSchool} dashboardYear={null} backHref="/" />);
    expect(screen.getByText("Private · Catholic · K–8")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /CA School Dashboard/ })).not.toBeInTheDocument();
  });
});
