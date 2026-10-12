import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fixtures } from "@/fixtures";
import { toSummary } from "@/lib/domain/records";
import { runAxe } from "@/test/a11y";
import { ResultRow } from "./result-row";
import { renderWithIntl } from "./test-utils";

// next-intl's Link needs the Next router; stand in with a plain anchor that adds the locale prefix.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

// Downtown Sacramento; distances are computed from the fixture coordinates.
const home = { latitude: 38.5781, longitude: -121.4944 };
const record = (name: string) => {
  const found = fixtures.schools.find((r) => r.school.name === name);
  if (!found) throw new Error(`fixture missing: ${name}`);
  return found;
};
const judah = toSummary(record("Theodore Judah Elementary"), home);
const stFrancis = toSummary(record("St. Francis of Assisi Elementary School"), home);

describe("ResultRow", () => {
  it("renders the mockup row for a public school", async () => {
    const onToggleCompare = vi.fn();
    const { container } = renderWithIntl(
      <ol className="list-none">
        <ResultRow
          number={1}
          summary={judah}
          href={`/school/${judah.school.cds}`}
          inCompare={false}
          onToggleCompare={onToggleCompare}
        />
      </ol>,
    );
    const row = screen.getAllByRole("listitem")[0];
    expect(within(row).getByText("1")).toBeInTheDocument();
    expect(
      within(row).getByText(/^District · public · Sacramento City Unified · TK–6 · [\d.]+ mi$/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Theodore Judah Elementary" })).toHaveAttribute(
      "href",
      `/en/school/${judah.school.cds}`,
    );
    expect(within(row).getByText(/485 students · 22\.4:1 student–teacher/)).toBeInTheDocument();
    expect(within(row).getByText("ELA Green")).toBeInTheDocument();
    expect(within(row).getByText("Absenteeism Orange")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details" })).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();

    const compare = screen.getByRole("button", { name: "Add to compare" });
    expect(compare).toHaveAttribute("aria-pressed", "false");
    compare.focus();
    await userEvent.keyboard("{Enter}");
    expect(onToggleCompare).toHaveBeenCalledWith(judah.school.cds);
  });

  it("offers My schools only when a handler is given", async () => {
    const onToggleMySchools = vi.fn();
    const row = (props: Partial<React.ComponentProps<typeof ResultRow>>) => (
      <ol className="list-none">
        <ResultRow
          number={1}
          summary={judah}
          href={`/school/${judah.school.cds}`}
          inCompare={false}
          onToggleCompare={() => {}}
          {...props}
        />
      </ol>
    );
    const { rerender } = renderWithIntl(row({}));
    expect(screen.queryByRole("button", { name: /My schools/ })).toBeNull();

    rerender(row({ onToggleMySchools }));
    const add = screen.getByRole("button", { name: "Add to My schools" });
    expect(add).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(add);
    expect(onToggleMySchools).toHaveBeenCalledWith(judah.school.cds);

    rerender(row({ onToggleMySchools, inMySchools: true, mySchoolsDisabled: true }));
    // Full list: a school already in it can still be taken out.
    expect(screen.getByRole("button", { name: "In My schools" })).toBeEnabled();
    rerender(row({ onToggleMySchools, mySchoolsDisabled: true }));
    expect(screen.getByRole("button", { name: "Add to My schools" })).toBeDisabled();
  });

  it("shows affiliation and Not rated for a private school and keeps Remove enabled when full", async () => {
    const onToggleCompare = vi.fn();
    renderWithIntl(
      <ol>
        <ResultRow
          number={3}
          summary={stFrancis}
          href="/school/x"
          inCompare
          compareDisabled
          onToggleCompare={onToggleCompare}
          note="Shown because it is in your compare list"
        />
      </ol>,
    );
    expect(screen.getByText(/^Private · Catholic · /)).toBeInTheDocument();
    expect(screen.getByText("Not rated")).toBeInTheDocument();
    expect(screen.getByText("Shown because it is in your compare list")).toBeInTheDocument();
    const compare = screen.getByRole("button", { name: "In compare list" });
    expect(compare).toHaveAttribute("aria-pressed", "true");
    expect(compare).toBeEnabled();
    await userEvent.click(compare);
    expect(onToggleCompare).toHaveBeenCalledWith(stFrancis.school.cds);
  });

  it("disables Add to compare when the list is full", () => {
    renderWithIntl(
      <ol>
        <ResultRow
          number={2}
          summary={judah}
          href="/school/x"
          inCompare={false}
          compareDisabled
          onToggleCompare={() => {}}
        />
      </ol>,
    );
    expect(screen.getByRole("button", { name: "Add to compare" })).toBeDisabled();
  });
});
