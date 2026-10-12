import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadDetail, loadNearby } from "./fixtures.test-helpers";
import { SchoolDetailView, sectionsFor } from "./school-detail-view";

vi.mock("@/i18n/navigation", () => import("./test-stubs"));
vi.mock("@/features/compare/use-compare-list", () => import("./test-stubs"));

function headings() {
  return screen.getAllByRole("heading").map((h) => `${h.tagName.toLowerCase()} ${h.textContent}`);
}

describe("SchoolDetailView", () => {
  it("renders every section in order for a public school, with a tab per section", async () => {
    const detail = await loadDetail(CDS.judah);
    const nearby = await loadNearby(CDS.judah);
    const { container } = renderWithIntl(
      <SchoolDetailView detail={detail} nearby={nearby} query={{}} />,
    );
    expect(headings()).toEqual([
      "h1 Theodore Judah Elementary",
      "h2 Overview",
      "h2 Directory facts",
      "h2 California School Dashboard",
      "h3 By year",
      "h2 Test scores",
      "h3 By year",
      "h2 Students",
      "h2 Nearby alternatives",
    ]);
    const tabs = within(screen.getByRole("navigation", { name: "Sections" })).getAllByRole("link");
    expect(tabs.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Overview", "#overview"],
      ["Dashboard", "#dashboard"],
      ["Test scores", "#tests"],
      ["Students", "#students"],
      ["Nearby", "#nearby"],
    ]);
    for (const [, href] of tabs.map((a) => [a.textContent, a.getAttribute("href")])) {
      expect(container.querySelector(href!)).not.toBeNull();
    }
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("hides the Dashboard and Test scores sections and tabs for a private school", async () => {
    expect(sectionsFor("private")).toEqual(["overview", "students", "nearby"]);
    const detail = await loadDetail(CDS.stFrancis);
    const nearby = await loadNearby(CDS.stFrancis);
    const { container } = renderWithIntl(
      <SchoolDetailView detail={detail} nearby={nearby} query={{}} />,
    );
    expect(headings()).toEqual([
      "h1 St. Francis of Assisi Elementary School",
      "h2 Overview",
      "h2 Directory facts",
      "h2 Students",
      "h2 Nearby alternatives",
    ]);
    expect(screen.queryByText("California School Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Test scores")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /CA School Dashboard/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Not rated on the California School Dashboard/)).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
