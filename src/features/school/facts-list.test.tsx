import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import { runAxe } from "@/test/a11y";
import { FactsList } from "./facts-list";
import { CDS, loadDetail } from "./fixtures.test-helpers";

/** { label: value } for every row of the list. */
function facts() {
  const terms = screen.getAllByRole("term").map((el) => el.textContent ?? "");
  const values = screen.getAllByRole("definition").map((el) => el.textContent ?? "");
  return Object.fromEntries(terms.map((t, i) => [t, values[i]]));
}

describe("FactsList", () => {
  it("lists directory facts for a district school, with distance from home", async () => {
    const detail = await loadDetail(CDS.judah);
    const { container } = renderWithIntl(
      <FactsList
        school={detail.school}
        privateDetail={null}
        home={{ latitude: 38.5781, longitude: -121.4944 }}
      />,
    );
    expect(facts()).toEqual({
      Address: "3919 McKinley Boulevard, Sacramento, CA 95819",
      "From home": "2.4 mi",
      Phone: "(916) 395-4790",
      Grades: "K–6",
      Type: "District · public · Traditional · Elementary",
      Magnet: "No",
      "Virtual instruction": "Not virtual",
      "Multilingual program": "No",
      Opened: "Jul 1, 1980",
      "CDS code": "34674396034292",
      "NCES ID": "063384005286",
      "Directory updated": "Nov 29, 2023",
    });
    expect(screen.getByRole("link", { name: "(916) 395-4790" })).toHaveAttribute(
      "href",
      "tel:+19163954790",
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("adds charter number and funding for a charter, and omits From home without a home", async () => {
    const detail = await loadDetail(CDS.sacHigh);
    renderWithIntl(<FactsList school={detail.school} privateDetail={null} />);
    const rows = facts();
    expect(rows["Charter number"]).toBe("0596");
    expect(rows["Charter funding"]).toBe("Directly funded");
    expect(rows["From home"]).toBeUndefined();
  });

  it("shows offered and served spans when they differ", async () => {
    const detail = await loadDetail(CDS.legion);
    renderWithIntl(<FactsList school={detail.school} privateDetail={null} />);
    expect(facts().Grades).toBe("9–12 offered · 10–12 served");
    expect(facts().Type).toBe("District · public · Continuation · High school");
  });

  it("shows affiliation and teacher counts for a private school", async () => {
    const detail = await loadDetail(CDS.stFrancis);
    const { container } = renderWithIntl(
      <FactsList school={detail.school} privateDetail={detail.privateDetail} />,
    );
    expect(facts()).toEqual({
      Address: "2500 K ST, Sacramento, CA 95816",
      Grades: "K–8",
      Type: "Private",
      Affiliation: "Catholic",
      "Full-time teachers": "15",
      "Part-time teachers": "3",
      "CDS code": "34674396976575",
      "NCES PSS ID": "A0700302",
    });
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
