import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import { rowFromSummary, summaryOf, toSummary } from "./records";

const home = { latitude: 38.5816, longitude: -121.4944 };

describe("search summaries", () => {
  it("a row built from a stored summary equals one built from the full record", () => {
    for (const record of fixtures.schools) {
      // Round-trip through JSON, as a summary stored in the database would be.
      const stored = JSON.parse(JSON.stringify(summaryOf(record)));
      expect(rowFromSummary(record.school, stored, home)).toEqual(toSummary(record, home));
    }
  });

  it("uses affidavit enrollment for private schools and Census Day enrollment for public ones", () => {
    const priv = fixtures.schools.find((r) => r.school.type === "private" && r.privateDetail);
    const pub = fixtures.schools.find((r) => r.school.type !== "private" && r.enrollment);
    expect(summaryOf(priv!).enrollment).toBe(priv!.privateDetail!.totalEnrollment);
    expect(summaryOf(pub!).enrollment).toBe(pub!.enrollment!.total);
  });

  it("carries one entry per Dashboard indicator present", () => {
    const rated = fixtures.schools.find((r) => r.dashboard.length >= 4)!;
    const summary = summaryOf(rated);
    for (const row of rated.dashboard) {
      expect(summary.dashboard[row.indicator]).toEqual({
        level: row.level,
        status: row.status,
        change: row.change,
      });
    }
    expect(summary.dashboard.year).toBe(Math.max(...rated.dashboard.map((d) => d.year)));
  });
});
