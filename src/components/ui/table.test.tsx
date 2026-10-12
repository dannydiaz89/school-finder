import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import {
  Table,
  TableBody,
  TableCell,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./table";

describe("Table", () => {
  it("renders a scrollable, semantically marked up table", async () => {
    const { container } = render(
      <Table minWidth={600}>
        <TableHead>
          <TableRow header>
            {/* The corner is a plain cell: an empty header fails axe. */}
            <TableCell />
            <TableHeaderCell>Theodore Judah</TableHeaderCell>
            <TableHeaderCell>Capitol Heights</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableGroupRow colSpan={3}>Location and grades</TableGroupRow>
          <TableRow>
            <TableHeaderCell scope="row">Distance from home</TableHeaderCell>
            <TableCell emphasis>0.9 mi</TableCell>
            <TableCell>1.4 mi</TableCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell scope="row">English Language Arts</TableHeaderCell>
            <TableCell>Green</TableCell>
            <TableCell muted>Not rated</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("table")).toHaveStyle({ minWidth: "600px" });
    expect(screen.getByRole("rowheader", { name: "Distance from home" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Location and grades" })).toHaveAttribute(
      "colspan",
      "3",
    );
    const best = screen.getByRole("cell", { name: /0\.9 mi/ });
    // Emphasis is a highlighter mark: tinted and bold, not weight alone.
    expect(best.querySelector("mark")).toHaveClass("font-bold", "bg-accent-subtle");
    expect(screen.getByRole("cell", { name: "Not rated" })).toHaveClass("text-fg-muted");
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
