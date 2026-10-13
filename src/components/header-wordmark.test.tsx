import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderWordmark } from "./header-wordmark";

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

const show = (path: string, search = "") => {
  pathname = path;
  query = search;
  return render(<HeaderWordmark>SchoolFinder</HeaderWordmark>);
};

describe("HeaderWordmark", () => {
  it("steps aside on the home screen, where the name is shown large", () => {
    const { container } = show("/");
    expect(screen.queryByRole("link")).toBeNull();
    const placeholder = container.firstElementChild!;
    expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(placeholder).toHaveClass("invisible");
  });

  it("is a link home once a search is showing, and on every other page", () => {
    show("/", "address=Sacramento");
    expect(screen.getByRole("link", { name: "SchoolFinder" })).toHaveAttribute("href", "/en/");
  });

  it.each(["/compare", "/my-schools", "/school/34674396034292", "/about/data"])(
    "is a link on %s",
    (path) => {
      show(path);
      expect(screen.getByRole("link", { name: "SchoolFinder" })).toBeInTheDocument();
    },
  );
});
