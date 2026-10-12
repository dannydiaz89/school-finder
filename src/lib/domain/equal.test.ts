import { describe, expect, it } from "vitest";
import { sameContent } from "./equal";

describe("sameContent", () => {
  const row = { cds: "34674396034292", year: 2025, indicator: "ela", level: "green", status: 31.5 };

  it("ignores key order, database bookkeeping, and undefined fields", () => {
    const stored = {
      _id: "abc",
      _creationTime: 1,
      status: 31.5,
      level: "green",
      indicator: "ela",
      year: 2025,
      cds: row.cds,
    };
    expect(sameContent(stored, row)).toBe(true);
    expect(sameContent(stored, { ...row, note: undefined })).toBe(true);
  });

  it("sees a changed, added, or removed value", () => {
    expect(sameContent(row, { ...row, status: 31.6 })).toBe(false);
    expect(sameContent(row, { ...row, level: null })).toBe(false);
    expect(sameContent(row, { ...row, change: 0 })).toBe(false);
    const withoutStatus = {
      cds: row.cds,
      year: row.year,
      indicator: row.indicator,
      level: row.level,
    };
    expect(sameContent(row, withoutStatus)).toBe(false);
  });

  it("compares nested objects and arrays, where array order matters", () => {
    const a = {
      byGrade: [
        { grade: "K", count: 5 },
        { grade: "1", count: 7 },
      ],
      race: { RA: 1, RB: 2 },
    };
    expect(
      sameContent(a, {
        race: { RB: 2, RA: 1 },
        byGrade: [
          { count: 5, grade: "K" },
          { grade: "1", count: 7 },
        ],
      }),
    ).toBe(true);
    expect(sameContent(a, { ...a, byGrade: [...a.byGrade].reverse() })).toBe(false);
  });

  it("does not confuse values of different types", () => {
    expect(sameContent({ a: 1 }, { a: "1" })).toBe(false);
    expect(sameContent({ a: null }, { a: 0 })).toBe(false);
    expect(sameContent({ a: null }, {})).toBe(false);
  });
});
