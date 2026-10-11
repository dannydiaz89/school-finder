import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { CDS, loadDetail } from "./fixtures.test-helpers";
import { StudentsSection } from "./students-section";

describe("StudentsSection", () => {
  it("shows race and ethnicity bars largest first and the student-group line", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(
      <StudentsSection enrollment={detail.enrollment} privateDetail={null} />,
    );
    expect(screen.getByText("Census Day enrollment, 2024-25")).toBeInTheDocument();
    expect(screen.getByText("White").parentElement).toHaveTextContent("49%");
    expect(screen.getByText("Hispanic or Latino").parentElement).toHaveTextContent("28%");
    const labels = ["White", "Hispanic or Latino", "Two or more races", "African American"];
    const positions = labels.map((l) => screen.getByText(l).compareDocumentPosition(container));
    expect(positions.every((p) => p & Node.DOCUMENT_POSITION_CONTAINS)).toBe(true);
    expect(
      screen.getByText(
        "13% students with disabilities · 5% English learners · 30% socioeconomically disadvantaged",
      ),
    ).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows enrollment by grade from the affidavit for a private school", async () => {
    const detail = await loadDetail(CDS.stFrancis);
    const { container } = renderWithIntl(
      <StudentsSection enrollment={detail.enrollment} privateDetail={detail.privateDetail} />,
    );
    expect(screen.getByText("Private School Affidavit, 2024-25")).toBeInTheDocument();
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(1 + 9 + 1);
    expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("K");
    expect(within(rows[1]).getByRole("cell")).toHaveTextContent("31");
    expect(within(rows[rows.length - 1]).getByRole("cell")).toHaveTextContent("294");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("says when no enrollment is published", () => {
    renderWithIntl(<StudentsSection enrollment={null} privateDetail={null} />);
    expect(screen.getByText(/No enrollment data is published/)).toBeInTheDocument();
  });
});
