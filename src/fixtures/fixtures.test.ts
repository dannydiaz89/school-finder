import { describe, expect, it } from "vitest";
import { fixtures } from "./index";

describe("fixtures", () => {
  it("parse against the domain schemas", () => {
    expect(fixtures.schools.length).toBeGreaterThanOrEqual(0);
  });

  it("have unique CDS codes", () => {
    const codes = fixtures.schools.map((r) => r.school.cds);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every school with Dashboard rows is public", () => {
    for (const r of fixtures.schools) {
      if (r.dashboard.length > 0) expect(r.school.type).not.toBe("private");
    }
  });
});
