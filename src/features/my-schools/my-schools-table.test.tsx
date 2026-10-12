import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { fixtures } from "@/fixtures";
import { fixturesDataSource } from "@/lib/data/fixtures";
import type { CdsCode, SchoolBrief } from "@/lib/schemas";
import { runAxe } from "@/test/a11y";
import { MySchoolsTable, indicatorColumns, newestDashboardYear } from "./my-schools-table";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

function cdsOf(name: string): CdsCode {
  const found = fixtures.schools.find((r) => r.school.name === name);
  if (!found) throw new Error(`fixture missing: ${name}`);
  return found.school.cds;
}

const JUDAH = cdsOf("Theodore Judah Elementary");
const SAC_HIGH = cdsOf("Sacramento Charter High");
const ST_FRANCIS = cdsOf("St. Francis of Assisi Elementary School");

let briefs: SchoolBrief[];
beforeAll(async () => {
  briefs = await fixturesDataSource.getSchoolBriefs({ cds: [JUDAH, SAC_HIGH, ST_FRANCIS] });
});

/** The pieces of text in a cell, in reading order. */
function pieces(cell: Element): string {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  const out: string[] = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent?.trim();
    if (text) out.push(text);
  }
  return out.join(" | ");
}

const rowOf = (name: string) => {
  const tr = screen.getByRole("link", { name }).closest("tr");
  if (!tr) throw new Error(`row missing: ${name}`);
  return Array.from(tr.querySelectorAll("th, td"), pieces);
};

describe("MySchoolsTable", () => {
  it("shows each school's level, result, and change from the year before", async () => {
    const { container } = renderWithIntl(<MySchoolsTable schools={briefs} onRemove={() => {}} />);
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "School",
      "English Language Arts",
      "Mathematics",
      "Chronic absenteeism",
      "Suspension rate",
      // A listed high school reports graduation, so the column appears.
      "Graduation rate",
      "Students",
    ]);
    expect(rowOf("Theodore Judah Elementary")).toEqual([
      "Theodore Judah Elementary | District · public · Sacramento City Unified · TK–6 · Sacramento | Remove",
      "Green | +31.5 pts | Increased 3.6",
      "Green | +5.8 pts | Maintained",
      "Orange | 19.3% | Increased 1.6",
      "Green | 0.6% | Maintained",
      "— | Not reported",
      "485",
    ]);
    expect(rowOf("Sacramento Charter High").slice(1, 6)).toEqual([
      "Green | +0.2 pts | Increased 23.9",
      "Red | -164.7 pts | Declined 18.8",
      "— | Not reported",
      "Yellow | 18.7% | Declined 4.9",
      "Green | 88% | Increased 1.3",
    ]);
    expect(screen.getByRole("link", { name: "Theodore Judah Elementary" })).toHaveAttribute(
      "href",
      `/en/school/${JUDAH}`,
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("says Not rated for a private school and Not reported for a suppressed result", () => {
    const suppressed: SchoolBrief = {
      ...briefs[0],
      dashboard: { ...briefs[0].dashboard, math: { level: null, status: null, change: null } },
    };
    renderWithIntl(<MySchoolsTable schools={[suppressed, briefs[2]]} onRemove={() => {}} />);
    expect(rowOf("Theodore Judah Elementary")[2]).toBe("Not reported");
    expect(rowOf("St. Francis of Assisi Elementary School").slice(1, 5)).toEqual([
      "Not rated",
      "Not rated",
      "Not rated",
      "Not rated",
    ]);
    // No high school in this list: no graduation column.
    expect(screen.queryByRole("columnheader", { name: "Graduation rate" })).toBeNull();
  });

  it("removes a school by name", async () => {
    const onRemove = vi.fn();
    renderWithIntl(<MySchoolsTable schools={briefs} onRemove={onRemove} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Sacramento Charter High from My schools" }),
    );
    expect(onRemove).toHaveBeenCalledWith(SAC_HIGH);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
  });

  it("picks columns and the newest year from the list", () => {
    expect(indicatorColumns([briefs[0]])).toEqual([
      "ela",
      "math",
      "chronicAbsenteeism",
      "suspension",
    ]);
    expect(indicatorColumns(briefs)).toContain("graduation");
    expect(newestDashboardYear(briefs)).toBe(2025);
    expect(newestDashboardYear([briefs[2]])).toBeNull();
  });
});
