import { describe, expect, it } from "vitest";
import { FrpmRow } from "@/lib/schemas/imports/frpm";
import { StaffRow } from "@/lib/schemas/imports/staff";
import { frpmFromRow } from "./frpm";
import { staffRatioFromRow } from "./staff";

describe("frpmFromRow", () => {
  const base = {
    "Academic Year": "2024-2025",
    "County Code": "34",
    "District Code": "75283",
    "School Code": "0135194",
    "School Name": "Paso Verde",
    "Educational Option Type": "Traditional",
    "Charter School (Y/N)": "No",
    "Low Grade": "K",
    "High Grade": "8",
    "Enrollment (K-12)": "955",
    "Free Meal Count (K-12)": "400",
    "Percent (%) Eligible Free (K-12)": "0.41884816753926701",
    "FRPM Count (K-12)": "500",
    "Percent (%) Eligible FRPM (K-12)": "0.52356020942408377",
  };

  it("normalizes the year and recomputes fractions from counts", () => {
    expect(frpmFromRow(FrpmRow.parse(base))).toEqual({
      cds: "34752830135194",
      year: "2024-25",
      enrollment: 955,
      freeCount: 400,
      frpmCount: 500,
      pctFree: 400 / 955,
      pctFrpm: 500 / 955,
    });
  });

  it("clamps counts above enrollment to 1", () => {
    const out = frpmFromRow(
      FrpmRow.parse({ ...base, "Enrollment (K-12)": "10", "FRPM Count (K-12)": "12" }),
    );
    expect(out?.pctFrpm).toBe(1);
  });

  it("is null for zero enrollment or missing counts", () => {
    expect(frpmFromRow(FrpmRow.parse({ ...base, "Enrollment (K-12)": "0" }))).toBeNull();
    expect(frpmFromRow(FrpmRow.parse({ ...base, "Free Meal Count (K-12)": "" }))).toBeNull();
  });
});

describe("staffRatioFromRow", () => {
  const base = {
    "Academic Year": "2023-24",
    "Aggregate Level": "S",
    "County Code": "34",
    "District Code": "75283",
    "School Code": "0135194",
    TOTAL_ENR_N: "1,012",
    TCH_FTE_N: "45.5",
    STU_TCH_RATIO: "22.2",
  };

  it("strips thousands separators", () => {
    expect(staffRatioFromRow(StaffRow.parse(base))).toEqual({
      cds: "34752830135194",
      year: "2023-24",
      enrollment: 1012,
      teacherFte: 45.5,
      studentTeacherRatio: 22.2,
    });
  });

  it("keeps a null ratio when CDE suppresses it", () => {
    expect(staffRatioFromRow(StaffRow.parse({ ...base, STU_TCH_RATIO: "" }))).toMatchObject({
      studentTeacherRatio: null,
    });
  });

  it("ignores district rows and rows without FTE", () => {
    expect(staffRatioFromRow(StaffRow.parse({ ...base, "Aggregate Level": "D" }))).toBeNull();
    expect(staffRatioFromRow(StaffRow.parse({ ...base, TCH_FTE_N: "" }))).toBeNull();
  });
});
