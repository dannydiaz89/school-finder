import { describe, expect, it } from "vitest";
import { CaasppRow } from "@/lib/schemas/imports/caaspp";
import { caasppEntity, caasppResultFromRow } from "./caaspp";

function raw(overrides: Record<string, string> = {}) {
  return CaasppRow.parse({
    "County Code": "34",
    "District Code": "75283",
    "District Name": "Natomas Unified",
    "School Code": "135194",
    "School Name": "Paso Verde",
    "Type ID": "7",
    Filler: "",
    "Test Year": "2025",
    "Test Type": "B",
    "Test ID": "1",
    "Student Group ID": "1",
    Grade: "13",
    "Total Students Enrolled": "520",
    "Total Students Tested": "512",
    "Mean Scale Score": "2450.1",
    "Percentage Standard Exceeded": "12.9",
    "Percentage Standard Met": "17.2",
    "Percentage Standard Met and Above": "30.11",
    "Percentage Standard Nearly Met": "27.96",
    "Percentage Standard Not Met": "41.94",
    ...overrides,
  });
}

describe("caasppResultFromRow", () => {
  it("pads codes and maps an all-grades ELA row", () => {
    expect(caasppResultFromRow(raw())).toEqual({
      cds: "34752830135194",
      year: "2024-25",
      subject: "ela",
      grade: "all",
      studentsTested: 512,
      meanScaleScore: 2450.1,
      pctExceeded: 12.9,
      pctMet: 17.2,
      pctMetAndAbove: 30.11,
      pctNearlyMet: 27.96,
      pctNotMet: 41.94,
    });
  });

  it("maps math and single grades", () => {
    expect(caasppResultFromRow(raw({ "Test ID": "2", Grade: "3" }))).toMatchObject({
      subject: "math",
      grade: "3",
    });
    expect(caasppResultFromRow(raw({ Grade: "11" }))).toMatchObject({ grade: "11" });
  });

  it("turns suppressed values into null", () => {
    const out = caasppResultFromRow(
      raw({ "Mean Scale Score": "*", "Percentage Standard Met and Above": "*" }),
    );
    expect(out).toMatchObject({ meanScaleScore: null, pctMetAndAbove: null });
  });

  it.each([[{ "Student Group ID": "3" }], [{ "Test ID": "3" }], [{ Grade: "9" }]])(
    "returns null for %j",
    (overrides) => {
      expect(caasppResultFromRow(raw(overrides))).toBeNull();
    },
  );

  it.each([
    ["4", "state"],
    ["5", "county"],
    ["6", "district"],
    ["7", "school"],
    ["9", "school"],
    ["10", "school"],
    ["11", "other"],
  ])("type %s is %s", (type, entity) => {
    expect(caasppEntity(raw({ "Type ID": type }))).toBe(entity);
  });

  it("state rows have the all-zero cds", () => {
    const out = caasppResultFromRow(
      raw({
        "County Code": "00",
        "District Code": "00000",
        "School Code": "0000000",
        "Type ID": "4",
      }),
    );
    expect(out?.cds).toBe("00000000000000");
  });
});
