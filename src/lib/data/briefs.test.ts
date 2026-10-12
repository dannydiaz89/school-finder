import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import { MAX_SAVED_SCHOOLS } from "@/lib/schemas";
import { getSchoolBriefs } from "./index";

const cds = fixtures.schools.map((r) => r.school.cds);

describe("getSchoolBriefs (fixtures backend)", () => {
  it("returns a summary row per school, in the order asked, without a distance", async () => {
    const rows = await getSchoolBriefs({ cds: [cds[3], cds[0], cds[4]] });
    expect(rows.map((r) => r.school.cds)).toEqual([cds[3], cds[0], cds[4]]);
    expect(rows[0]).not.toHaveProperty("distanceMeters");
    expect(Object.keys(rows[0]).sort()).toEqual([
      "dashboard",
      "enrollment",
      "school",
      "studentTeacherRatio",
    ]);
  });

  it("carries the newest year's level, result, and change", async () => {
    const [judah] = await getSchoolBriefs({ cds: ["34674396034292"] });
    expect(judah.dashboard.year).toBe(2025);
    expect(judah.dashboard.ela).toEqual({ level: "green", status: 31.5, change: 3.6 });
  });

  it("drops codes the data does not know", async () => {
    const rows = await getSchoolBriefs({ cds: [cds[0], "99999999999999"] });
    expect(rows.map((r) => r.school.cds)).toEqual([cds[0]]);
  });

  it("rejects an empty list and one past the maximum", async () => {
    await expect(getSchoolBriefs({ cds: [] })).rejects.toThrow();
    const tooMany = Array.from(
      { length: MAX_SAVED_SCHOOLS + 1 },
      (_, i) => `34674396${String(i).padStart(6, "0")}`,
    );
    await expect(getSchoolBriefs({ cds: tooMany })).rejects.toThrow();
  });
});
