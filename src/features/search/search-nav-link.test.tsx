import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { getLastSearchSnapshot, resetLastSearchForTests, writeLastSearch } from "./last-search";
import { SearchNavLink } from "./search-nav-link";

let pathname = "/";
let query = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname,
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

const SEARCH = "address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13&type=charter";

beforeEach(() => {
  resetLastSearchForTests();
  pathname = "/";
  query = "";
});

describe("SearchNavLink", () => {
  it("is the plain Search link when nothing has been searched", async () => {
    pathname = "/compare";
    const { container } = renderWithIntl(<SearchNavLink />);
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/en/");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("remembers the search while the search page is on screen", () => {
    query = SEARCH;
    renderWithIntl(<SearchNavLink />);
    expect(getLastSearchSnapshot()).toBe(SEARCH);
    // On the search page the link starts a new search.
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/en/");
  });

  it("leads back to the last search from another page", () => {
    // Regression: Compare, then Search, landed on an empty search page.
    writeLastSearch(SEARCH);
    pathname = "/compare";
    query = "compare=34674396034292";
    renderWithIntl(<SearchNavLink />);
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", `/en/?${SEARCH}`);
    // Another page's address is not a search and must not replace it.
    expect(getLastSearchSnapshot()).toBe(SEARCH);
  });

  it("forgets the search once the search page is shown blank", () => {
    writeLastSearch(SEARCH);
    renderWithIntl(<SearchNavLink />);
    expect(getLastSearchSnapshot()).toBe("");
  });
});
