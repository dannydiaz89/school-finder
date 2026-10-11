import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CompareNavLink } from "./compare-nav-link";

let query = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

describe("CompareNavLink", () => {
  it("is the plain Compare link when the list is empty", async () => {
    query = "";
    const { container } = renderWithIntl(<CompareNavLink />);
    const link = screen.getByRole("link", { name: "Compare" });
    expect(link).toHaveAttribute("href", "/en/compare");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows the count and carries the list in the link", () => {
    query = "compare=34674396034292,34674390102038";
    renderWithIntl(<CompareNavLink />);
    const link = screen.getByRole("link", { name: "Compare (2)" });
    expect(link).toHaveAttribute("href", "/en/compare?compare=34674396034292,34674390102038");
  });

  it("carries the home address and coordinates so compare can show distance", () => {
    query = "compare=34674396034292&address=1420+J+St&lat=38.58&lng=-121.49&radius=5&sort=ela";
    renderWithIntl(<CompareNavLink />);
    const link = screen.getByRole("link", { name: "Compare (1)" });
    expect(link).toHaveAttribute(
      "href",
      "/en/compare?compare=34674396034292&address=1420%20J%20St&lat=38.58&lng=-121.49&radius=5",
    );
  });

  it("keeps the home context even with an empty list", () => {
    query = "lat=38.58&lng=-121.49";
    renderWithIntl(<CompareNavLink />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/en/compare?lat=38.58&lng=-121.49");
  });

  it("ignores a malformed list", () => {
    query = "compare=not-a-cds";
    renderWithIntl(<CompareNavLink />);
    expect(screen.getByRole("link", { name: "Compare" })).toHaveAttribute("href", "/en/compare");
  });
});
