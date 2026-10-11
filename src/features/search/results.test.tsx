import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fixtures } from "@/fixtures";
import { toSummary } from "@/lib/domain/records";
import { parseSearchParams, type SearchResult } from "@/lib/schemas";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { SearchResults } from "./results";

/*
 * The list is the accessible path, so the test drives it: rows render
 * fixture summaries in order, compare toggles write the URL through the
 * real useCompareList hook (over a stubbed useSearchParams), and the map
 * (browser-only, loaded with next/dynamic) is replaced by a stub.
 */

let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => search,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="map-stub" />,
}));

const home = { latitude: 38.57871, longitude: -121.48766 };
const rows = fixtures.schools
  .map((r) => toSummary(r, home))
  .sort((a, b) => a.distanceMeters - b.distanceMeters)
  .slice(0, 3);
const result: SearchResult = {
  schools: rows,
  total: 10,
  countsByType: { district: 7, charter: 2, private: 1 },
  hiddenSpecialized: 0,
  truncated: false,
};
const params = parseSearchParams({ lat: String(home.latitude), lng: String(home.longitude) });

function renderResults() {
  return renderWithIntl(
    <SearchResults
      result={result}
      params={params}
      center={home}
      header={<h2>10 schools within 3 miles</h2>}
      footer={<p>About these results</p>}
    />,
  );
}

describe("SearchResults", () => {
  it("renders numbered rows for the fixture summaries with details links and the map region", async () => {
    search = new URLSearchParams();
    const { container } = renderWithIntl(
      <SearchResults
        result={result}
        params={params}
        center={home}
        header={<h2>10 schools within 3 miles</h2>}
        footer={<p>About these results</p>}
      />,
    );
    const list = screen.getByRole("region", { name: "Search results" });
    const items = within(list)
      .getAllByRole("listitem")
      .filter((li) => li.parentElement?.tagName === "OL");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("1")).toBeInTheDocument();
    expect(within(items[0]).getByRole("link", { name: rows[0].school.name })).toHaveAttribute(
      "href",
      `/en/school/${rows[0].school.cds}`,
    );
    expect(screen.getByRole("region", { name: "Map of results" })).toBeInTheDocument();
    expect(screen.getByTestId("map-stub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More schools" })).toBeInTheDocument();
    expect(screen.getByText("Showing 3 of 10")).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("toggles compare through the URL and carries the list into details links", async () => {
    search = new URLSearchParams();
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    const { rerender } = renderResults();

    const buttons = screen.getAllByRole("button", { name: "Add to compare" });
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[0]);
    expect(replaceState).toHaveBeenCalledWith(null, "", `/?compare=${rows[0].school.cds}`);

    // Simulate Next syncing useSearchParams with the new URL.
    search = new URLSearchParams(`compare=${rows[0].school.cds}`);
    rerender(
      <SearchResults
        result={result}
        params={params}
        center={home}
        header={<h2>10 schools within 3 miles</h2>}
        footer={<p>About these results</p>}
      />,
    );
    expect(screen.getByRole("button", { name: "In compare list" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("button", { name: "Add to compare" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Details" })[1]).toHaveAttribute(
      "href",
      `/en/school/${rows[1].school.cds}?compare=${rows[0].school.cds}`,
    );

    await userEvent.click(screen.getByRole("button", { name: "In compare list" }));
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/");
    replaceState.mockRestore();
  });

  it("shows the empty state content from the header and no More button when everything is shown", () => {
    search = new URLSearchParams();
    renderWithIntl(
      <SearchResults
        result={{ ...result, schools: [], total: 0 }}
        params={params}
        center={home}
        header={<p>No schools match</p>}
        footer={null}
      />,
    );
    expect(screen.getByText("No schools match")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More schools" })).not.toBeInTheDocument();
  });
});
