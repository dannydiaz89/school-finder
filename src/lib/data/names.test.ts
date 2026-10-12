import { describe, expect, it } from "vitest";
import { findSchoolsByName } from "./index";

describe("findSchoolsByName (fixtures backend)", () => {
  it("finds a school by part of its name", async () => {
    const matches = await findSchoolsByName({ query: "judah", limit: 10 });
    expect(matches.map((m) => m.school.name)).toEqual(["Theodore Judah Elementary"]);
    // The row carries what a result row shows.
    expect(matches[0].dashboard.ela?.level).toBeDefined();
    expect(matches[0].enrollment).toBeGreaterThan(0);
    expect(matches[0]).not.toHaveProperty("distanceMeters");
  });

  it("finds private schools too", async () => {
    const matches = await findSchoolsByName({ query: "st francis", limit: 10 });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.school.type === "private")).toBe(true);
  });

  it("narrows by city and respects the limit", async () => {
    const all = await findSchoolsByName({ query: "elementary sacramento", limit: 50 });
    expect(all.length).toBeGreaterThan(3);
    expect(all.every((m) => /elementary/i.test(m.school.name))).toBe(true);
    expect(await findSchoolsByName({ query: "elementary sacramento", limit: 2 })).toHaveLength(2);
  });

  it("returns nothing for an unknown name and rejects a one-letter query", async () => {
    expect(await findSchoolsByName({ query: "zzzz nothing", limit: 10 })).toEqual([]);
    await expect(findSchoolsByName({ query: "a", limit: 10 })).rejects.toThrow();
  });
});
