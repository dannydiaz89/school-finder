import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { resetCompareStoreForTests, writeCompareList } from "@/features/compare/store";
import { browserSavedSchools, resetMySchoolsStoreForTests } from "@/features/my-schools/store";
import type { CdsCode } from "@/lib/schemas";
import { runAxe } from "@/test/a11y";
import { resetLastSearchForTests, writeLastSearch } from "./last-search";
import { StartingPoints } from "./starting-points";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

const A = "34674396034292" as CdsCode;
const B = "34674390102038" as CdsCode;

beforeEach(() => {
  resetLastSearchForTests();
  resetCompareStoreForTests();
  resetMySchoolsStoreForTests();
});

describe("StartingPoints", () => {
  it("shows nothing on a first visit, and still holds its place", () => {
    renderWithIntl(<StartingPoints />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Ways to start" })).toBeInTheDocument();
  });

  it("offers the last search, My schools, and the compare list when they exist", async () => {
    writeLastSearch("address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13&radius=5");
    // Going back to the blank home screen is what a visitor does next; the offer survives it.
    writeLastSearch("");
    browserSavedSchools.write([A, B].map((cds) => ({ cds, addedAt: "2026-10-12T18:00:00.000Z" })));
    writeCompareList([A]);
    const { container } = renderWithIntl(<StartingPoints />);
    expect(screen.getByText("Last search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Downey, CA · within 5 mi" })).toHaveAttribute(
      "href",
      "/en/?address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13&radius=5",
    );
    expect(screen.getByRole("link", { name: "My schools (2)" })).toHaveAttribute(
      "href",
      `/en/my-schools?schools=${A},${B}`,
    );
    expect(screen.getByRole("link", { name: "Compare (1)" })).toHaveAttribute(
      "href",
      `/en/compare?compare=${A}`,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("labels a name search by its text alone", () => {
    writeLastSearch("address=Lincoln+High");
    renderWithIntl(<StartingPoints />);
    expect(screen.getByRole("link", { name: "Lincoln High" })).toHaveAttribute(
      "href",
      "/en/?address=Lincoln+High",
    );
    expect(screen.queryByRole("link", { name: /My schools|Compare/ })).toBeNull();
  });
});
