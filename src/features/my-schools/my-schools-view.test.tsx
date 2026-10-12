import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { fixtures } from "@/fixtures";
import { fixturesDataSource } from "@/lib/data/fixtures";
import type { CdsCode, SchoolBrief } from "@/lib/schemas";
import { runAxe } from "@/test/a11y";
import { MySchoolsView } from "./my-schools-view";
import { browserSavedSchools, resetMySchoolsStoreForTests } from "./store";

let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ replace }),
}));
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
const CROCKER = cdsOf("Crocker/Riverside Elementary");
const CLOSED = "99999999999999" as CdsCode;

const save = (...codes: CdsCode[]) =>
  browserSavedSchools.write(codes.map((cds) => ({ cds, addedAt: "2026-10-12T18:00:00.000Z" })));

let briefs: SchoolBrief[];
beforeAll(async () => {
  briefs = await fixturesDataSource.getSchoolBriefs({ cds: [JUDAH, CROCKER] });
});

beforeEach(() => {
  resetMySchoolsStoreForTests();
  replace.mockClear();
  query = "";
  window.history.replaceState(null, "", "/en/my-schools");
});

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("a")?.textContent);

describe("MySchoolsView", () => {
  it("lists the saved schools by name and says where the list is kept", async () => {
    save(JUDAH, CROCKER);
    query = `schools=${JUDAH},${CROCKER}`;
    const { container } = renderWithIntl(<MySchoolsView schools={briefs} />);
    expect(screen.getByRole("heading", { level: 1, name: "My schools" })).toBeInTheDocument();
    // Alphabetical, whatever order they were added in.
    expect(names()).toEqual(["Crocker/Riverside Elementary", "Theodore Judah Elementary"]);
    expect(
      screen.getByText(
        "2 schools · California School Dashboard 2025: level, result, and change from the year before",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/This list is saved in this browser/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows the empty state with a way to start", () => {
    renderWithIntl(<MySchoolsView schools={[]} />);
    expect(screen.getByText("No schools saved yet")).toBeInTheDocument();
    expect(screen.getByText(/The list holds up to 50/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find schools" })).toHaveAttribute("href", "/en/");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("asks the server for the list when the address does not carry it", () => {
    // A bookmark of /my-schools: the browser knows the list, this render has no rows yet.
    save(JUDAH, CROCKER);
    renderWithIntl(<MySchoolsView schools={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("No schools saved yet")).toBeNull();
    expect(replace).toHaveBeenCalledWith(`/en/my-schools?schools=${JUDAH},${CROCKER}`, {
      scroll: false,
    });
  });

  it("removes a school at once and corrects the address without asking the server", async () => {
    save(JUDAH, CROCKER);
    query = `schools=${JUDAH},${CROCKER}`;
    renderWithIntl(<MySchoolsView schools={briefs} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Theodore Judah Elementary from My schools" }),
    );
    expect(names()).toEqual(["Crocker/Riverside Elementary"]);
    expect(browserSavedSchools.getSnapshot().map((e) => e.cds)).toEqual([CROCKER]);
    expect(window.location.search).toBe(`?schools=${CROCKER}`);
    expect(replace).not.toHaveBeenCalled();
  });

  it("ignores schools in the address that are not in the list", () => {
    // Someone else's link, or an old bookmark: the browser's own list decides.
    save(CROCKER);
    query = `schools=${JUDAH},${CROCKER}`;
    renderWithIntl(<MySchoolsView schools={briefs} />);
    expect(names()).toEqual(["Crocker/Riverside Elementary"]);
    expect(window.location.search).toBe(`?schools=${CROCKER}`);
  });

  it("says when a saved school is no longer in the data and offers to drop it", async () => {
    save(JUDAH, CLOSED);
    query = `schools=${JUDAH},${CLOSED}`;
    renderWithIntl(<MySchoolsView schools={[briefs[0]]} />);
    expect(names()).toEqual(["Theodore Judah Elementary"]);
    expect(screen.getByText(/1 saved school is not in the current state data/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove from the list" }));
    expect(browserSavedSchools.getSnapshot().map((e) => e.cds)).toEqual([JUDAH]);
    expect(screen.queryByText(/not in the current state data/)).toBeNull();
  });

  it("picks up a school added in another tab", () => {
    save(JUDAH);
    query = `schools=${JUDAH}`;
    renderWithIntl(<MySchoolsView schools={[briefs[0]]} />);
    act(() => save(JUDAH, CROCKER));
    // No data for the new school in this render, so the server is asked.
    expect(replace).toHaveBeenCalledWith(`/en/my-schools?schools=${JUDAH},${CROCKER}`, {
      scroll: false,
    });
  });
});
