import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { fixturesDataSource } from "@/lib/data/fixtures";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/schemas";
import { runAxe } from "@/test/a11y";
import { PinCard } from "./pin-card";

vi.mock("@/i18n/navigation", () => ({
  Link: (props: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={props.href} className={props.className}>
      {props.children}
    </a>
  ),
}));
async function rows() {
  const result = await fixturesDataSource.searchSchools({
    center: { latitude: 38.5816, longitude: -121.4944 },
    radiusMiles: 4,
    filters: DEFAULT_SEARCH_FILTERS,
    sort: "distance",
    limit: 50,
    offset: 0,
  });
  return result.schools;
}

describe("PinCard", () => {
  it("shows a public school's name, type, grades, distance, enrollment, and ratings", async () => {
    const school = (await rows()).find((r) => r.school.name === "Theodore Judah Elementary")!;
    const { container } = renderWithIntl(<PinCard summary={school} number={4} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Theodore Judah Elementary");
    expect(text).toContain("District · public");
    expect(text).toMatch(/K–6/);
    expect(text).toMatch(/\d(\.\d)? mi/);
    expect(text).toContain("Sacramento City Unified");
    expect(text).toMatch(/\d+ students/);
    expect(text).toMatch(/ELA (Blue|Green|Yellow|Orange|Red)/);
    expect(text).not.toMatch(/·\s*·/);
    // A hover preview repeats the list row, so it is hidden from assistive technology and inert.
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says a private school is not rated", async () => {
    const school = (await rows()).find((r) => r.school.type === "private")!;
    const { container } = renderWithIntl(<PinCard summary={school} number={1} />);
    expect(container.textContent).toContain("Not rated");
    expect(container.textContent).toContain("Private");
  });

  it("when pinned by a tap, is reachable, links to the school, and can be closed", async () => {
    const school = (await rows())[0];
    const onClose = vi.fn();
    const { container } = renderWithIntl(
      <PinCard summary={school} number={1} pinned detailsHref="/school/x" onClose={onClose} />,
    );
    expect(screen.getByRole("group", { name: school.school.name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("href", "/school/x");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
