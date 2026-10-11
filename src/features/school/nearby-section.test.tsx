import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadNearby } from "./fixtures.test-helpers";
import { NearbySection } from "./nearby-section";
import { compareState } from "./test-stubs";

vi.mock("@/i18n/navigation", () => import("./test-stubs"));
vi.mock("@/features/compare/use-compare-list", () => import("./test-stubs"));

describe("NearbySection", () => {
  beforeEach(() => {
    compareState.list = [];
    compareState.isFull = false;
    compareState.toggle.mockClear();
  });

  it("lists the nearest schools as numbered result rows and links to compare them", async () => {
    const nearby = await loadNearby(CDS.judah);
    const { container } = renderWithIntl(
      <NearbySection cds={CDS.judah} nearby={nearby} query={{ lat: "38.5", lng: "-121.4" }} />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Nearby alternatives" }),
    ).toBeInTheDocument();
    const list = container.querySelector("ol");
    if (!list) throw new Error("no ordered list");
    const items = Array.from(list.children) as HTMLElement[];
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("Miwok Middle");
    expect(items[0]).toHaveTextContent(/0\.7 mi/);
    expect(within(items[0]).getByRole("link", { name: "Miwok Middle" })).toHaveAttribute(
      "href",
      `/en/school/${nearby[0].school.cds}?lat=38.5&lng=-121.4`,
    );
    const compareAll = screen.getByRole("link", { name: "Compare with the 4 nearest" });
    const expected = [CDS.judah, ...nearby.slice(0, 4).map((r) => r.school.cds)].join(",");
    expect(compareAll).toHaveAttribute(
      "href",
      `/en/compare?lat=38.5&lng=-121.4&compare=${encodeURIComponent(expected)}`,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("reflects and toggles the compare list", async () => {
    const nearby = await loadNearby(CDS.judah);
    compareState.list = [nearby[1].school.cds];
    renderWithIntl(<NearbySection cds={CDS.judah} nearby={nearby} query={{}} />);
    const buttons = screen.getAllByRole("button", { pressed: true });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("In compare list");
    // Detail links carry the current compare list.
    expect(screen.getByRole("link", { name: "Miwok Middle" })).toHaveAttribute(
      "href",
      `/en/school/${nearby[0].school.cds}?compare=${nearby[1].school.cds}`,
    );
  });

  it("says when nothing is nearby", () => {
    renderWithIntl(<NearbySection cds={CDS.judah} nearby={[]} query={{}} />);
    expect(screen.getByText(/No other schools in the data/)).toBeInTheDocument();
  });
});
