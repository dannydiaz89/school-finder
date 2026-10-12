import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { fixtures } from "@/fixtures";
import { fixturesDataSource } from "@/lib/data/fixtures";
import type { CdsCode, SchoolDetail } from "@/lib/schemas";
import { runAxe } from "@/test/a11y";
import { CompareTable } from "./compare-table";

// next-intl's Link needs the Next router; stand in with a plain anchor that adds the locale prefix.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

// Downtown Sacramento; distances come from the fixture coordinates.
const home = { latitude: 38.5781, longitude: -121.4944 };

function cdsOf(name: string): CdsCode {
  const found = fixtures.schools.find((r) => r.school.name === name);
  if (!found) throw new Error(`fixture missing: ${name}`);
  return found.school.cds;
}

const JUDAH = cdsOf("Theodore Judah Elementary"); // district, ELA green, math green
const SAC_HIGH = cdsOf("Sacramento Charter High"); // charter, ELA green, math red
const ST_FRANCIS = cdsOf("St. Francis of Assisi Elementary School"); // private

let schools: SchoolDetail[];
beforeAll(async () => {
  schools = await fixturesDataSource.getSchoolsByCds({ cds: [JUDAH, SAC_HIGH, ST_FRANCIS] });
});

/** Cells of the nth row with this label (ELA and Math appear under Dashboard and under CAASPP). */
const cellsOf = (label: string, nth = 0) => {
  const tr = screen.getAllByRole("rowheader", { name: label })[nth]?.closest("tr");
  if (!tr) throw new Error(`row missing: ${label}`);
  return within(tr).getAllByRole("cell");
};

describe("CompareTable", () => {
  it("renders a column per school with name link, type line, and Remove", async () => {
    const onRemove = vi.fn();
    const { container } = renderWithIntl(
      <CompareTable
        schools={schools}
        home={home}
        query={`?compare=${JUDAH}`}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByRole("link", { name: "Theodore Judah Elementary" })).toHaveAttribute(
      "href",
      `/en/school/${JUDAH}?compare=${JUDAH}`,
    );
    expect(
      screen.getByText("District · public · Sacramento City Unified · TK–6"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Charter · public · Sacramento City Unified · 9–12"),
    ).toBeInTheDocument();
    expect(screen.getByText("Private · Catholic · K–8")).toBeInTheDocument();

    const remove = screen.getByRole("button", { name: "Remove Theodore Judah Elementary" });
    expect(remove).toHaveTextContent("Remove");
    await userEvent.click(remove);
    expect(onRemove).toHaveBeenCalledWith(JUDAH);

    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("marks the best value in comparable rows and leaves facts alone", () => {
    renderWithIntl(<CompareTable schools={schools} home={home} query="" onRemove={() => {}} />);

    // Distance: exactly one shortest.
    const distance = cellsOf("Distance from home");
    expect(distance).toHaveLength(3);
    expect(distance.filter((c) => c.querySelector("mark") !== null)).toHaveLength(1);

    // Dashboard ELA: Judah and Sac High are both Green, but Judah is 31.5 points above standard
    // and Sac High 0.2, so only Judah is highlighted; the private school is not rated.
    const ela = cellsOf("English Language Arts");
    expect(ela[0].querySelector("mark")).not.toBeNull();
    expect(ela[1].querySelector("mark")).toBeNull();
    expect(ela[2].querySelector("mark")).toBeNull();
    expect(ela[2]).toHaveTextContent("Not rated");
    expect(ela[2]).toHaveClass("text-fg-muted");
    expect(within(ela[0]).getByText("Green")).toBeInTheDocument();
    expect(within(ela[0]).getByText("31.5 pts above standard")).toHaveClass("text-fg-muted");

    // Dashboard Math: Judah Green beats Sac High Red.
    const math = cellsOf("Mathematics");
    expect(math[0].querySelector("mark")).not.toBeNull();
    expect(math[1].querySelector("mark")).toBeNull();
    expect(within(math[1]).getByText("Red")).toBeInTheDocument();

    // Percent-style indicator status.
    expect(within(cellsOf("Suspension rate")[0]).getByText("0.6%")).toBeInTheDocument();

    // Rows a high school has but an elementary school lacks show a dash for the elementary.
    const graduation = cellsOf("Graduation rate");
    expect(graduation[0]).toHaveTextContent("—");
    expect(within(graduation[1]).getByText("Green")).toBeInTheDocument();

    // Student-teacher ratio: lowest wins.
    const ratio = cellsOf("Student–teacher ratio, 2023-24");
    expect(ratio[0]).toHaveTextContent("22.4:1");
    expect(ratio[1]).toHaveTextContent("18.7:1");
    expect(ratio[1].querySelector("mark")).not.toBeNull();
    expect(ratio[0].querySelector("mark")).toBeNull();
    expect(ratio[2]).toHaveTextContent("Not reported");

    // Enrollment is a fact, never bold.
    const enrollment = cellsOf("Enrollment, 2024-25");
    expect(enrollment.map((c) => c.textContent)).toEqual(["485", "413", "294"]);
    expect(enrollment.some((c) => c.querySelector("mark") !== null)).toBe(false);

    // Transitional kindergarten: shown only where the data proves it.
    expect(cellsOf("Transitional kindergarten").map((c) => c.textContent)).toEqual([
      "Yes",
      "—",
      "—",
    ]);
    // Programs carries the directory's flags. "None listed" is a fact; a dash is no data.
    expect(cellsOf("Programs").map((c) => c.textContent)).toEqual([
      "None listed",
      "None listed",
      "—",
    ]);
    expect(screen.queryByRole("rowheader", { name: "Magnet" })).toBeNull();
  });

  it("shows test scores as percentages with the best bold and private as not tested", () => {
    renderWithIntl(<CompareTable schools={schools} query="" onRemove={() => {}} />);

    expect(screen.queryByRole("rowheader", { name: "Distance from home" })).toBeNull();
    expect(screen.getByText(/Test scores, CAASPP 2024-25/)).toBeInTheDocument();

    const tests = cellsOf("English Language Arts", 1);
    expect(tests[0]).toHaveTextContent("63%");
    expect(tests[0].querySelector("mark")).not.toBeNull();
    expect(tests[1]).toHaveTextContent("51%");
    expect(tests[1].querySelector("mark")).toBeNull();
    expect(tests[2]).toHaveTextContent("Not tested");
    expect(tests[2]).toHaveClass("text-fg-muted");

    expect(
      within(cellsOf("Free / reduced meals, 2024-25")[0]).getByText("30%"),
    ).toBeInTheDocument();
    expect(within(cellsOf("English learners, 2024-25")[0]).getByText("5%")).toBeInTheDocument();
  });

  it("marks nothing in a Dashboard row where color and number disagree", () => {
    // Leffingwell and Murphy Ranch, 2025: Yellow at 6.7% chronically absent beside Orange at 6%.
    const withAbsenteeism = (
      school: SchoolDetail,
      cds: string,
      level: "yellow" | "orange",
      status: number,
    ) => ({
      ...school,
      school: { ...school.school, cds: cds as CdsCode },
      dashboard: school.dashboard.map((r) =>
        r.indicator === "chronicAbsenteeism" ? { ...r, level, status } : r,
      ),
    });
    renderWithIntl(
      <CompareTable
        schools={[
          withAbsenteeism(schools[0], "19644856089148", "yellow", 6.7),
          withAbsenteeism(schools[0], "19644856013080", "orange", 6),
        ]}
        query=""
        onRemove={() => {}}
      />,
    );
    const cells = cellsOf("Chronic absenteeism");
    expect(cells.map((c) => c.textContent)).toEqual(["Yellow6.7%", "Orange6%"]);
    expect(cells.some((c) => c.querySelector("mark") !== null)).toBe(false);
    // The same school twice otherwise: every other row is a tie, so nothing is marked at all.
    expect(document.querySelector("mark")).toBeNull();
    expect(
      screen.getByText("· a color reflects this year's result and its change from the year before"),
    ).toBeInTheDocument();
  });

  it("says Not reported for a suppressed indicator and dates each cell when years differ", () => {
    const suppressed: SchoolDetail = {
      ...schools[1],
      dashboard: schools[1].dashboard.map((r) =>
        r.indicator === "elpi" ? { ...r, level: null, status: null, change: null } : r,
      ),
      staff: { ...schools[1].staff!, year: "2022-23" },
    };
    renderWithIntl(
      <CompareTable schools={[schools[0], suppressed]} query="" onRemove={() => {}} />,
    );
    const progress = cellsOf("English learner progress");
    expect(progress[0]).toHaveTextContent("No level62.5%");
    expect(progress[1]).toHaveTextContent("Not reported");
    expect(progress[1]).toHaveClass("text-fg-muted");
    // Ratios from two different years: no year in the label, one in each cell.
    const ratio = cellsOf("Student–teacher ratio");
    expect(ratio.map((c) => c.textContent)).toEqual([
      "22.4:1 · 2023-24",
      "18.7:1 · 2022-23 (best in this row)",
    ]);
  });

  it("scrolls sideways inside the table instead of breaking the page", () => {
    const { container } = renderWithIntl(
      <CompareTable schools={schools} query="" onRemove={() => {}} />,
    );
    expect(container.firstElementChild).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("table")).toHaveStyle({ minWidth: `${230 + 170 * 3}px` });
  });
});
