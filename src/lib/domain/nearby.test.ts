import { describe, expect, it } from "vitest";
import { fixtures } from "@/fixtures";
import type { GradeSpan, School } from "@/lib/schemas";
import { NEARBY_RADII_MILES, isAlternativeTo, servesSameGrades, sharedGrades } from "./nearby";

const span = (low: string, high: string) => ({ low, high }) as GradeSpan;

describe("sharedGrades", () => {
  it("counts the grades two spans have in common", () => {
    expect(sharedGrades(span("9", "12"), span("6", "12"))).toBe(4);
    expect(sharedGrades(span("K", "6"), span("6", "8"))).toBe(1);
    expect(sharedGrades(span("K", "5"), span("9", "12"))).toBe(0);
    expect(sharedGrades(span("TK", "5"), span("K", "5"))).toBe(6);
  });
});

describe("servesSameGrades", () => {
  it.each([
    // John C. Fremont Senior High is 9-12.
    ["9", "12", "9", "12", true],
    ["9", "12", "6", "12", true],
    ["9", "12", "K", "12", true],
    ["9", "12", "7", "12", true],
    // The schools its page used to list: elementary and middle schools.
    ["9", "12", "TK", "6", false],
    ["9", "12", "K", "6", false],
    ["9", "12", "6", "8", false],
    // Elementary schools: other elementary schools and K-8 schools, not the middle school they feed.
    ["TK", "5", "K", "5", true],
    ["K", "5", "K", "8", true],
    ["K", "6", "6", "8", false],
    ["K", "6", "7", "8", false],
    // Middle schools.
    ["6", "8", "7", "8", true],
    ["6", "8", "K", "8", true],
    ["6", "8", "7", "12", true],
    ["6", "8", "9", "12", false],
  ] as const)("%s-%s and %s-%s: %s", (aLow, aHigh, bLow, bHigh, expected) => {
    expect(servesSameGrades(span(aLow, aHigh), span(bLow, bHigh))).toBe(expected);
    // The rule has no direction.
    expect(servesSameGrades(span(bLow, bHigh), span(aLow, aHigh))).toBe(expected);
  });
});

describe("isAlternativeTo", () => {
  const school = (name: string) => fixtures.schools.find((r) => r.school.name === name)!.school;
  const judah = school("Theodore Judah Elementary"); // TK-6
  const mcclatchy = school("C. K. McClatchy High"); // 9-12
  const sacHigh = school("Sacramento Charter High"); // 9-12, charter
  const legion = school("American Legion High (Continuation)");

  it("matches schools on grades, whatever their type", () => {
    expect(isAlternativeTo(mcclatchy, sacHigh)).toBe(true);
    expect(isAlternativeTo(mcclatchy, judah)).toBe(false);
    expect(isAlternativeTo(judah, mcclatchy)).toBe(false);
    expect(isAlternativeTo(judah, school("Crocker/Riverside Elementary"))).toBe(true);
  });

  it("never lists the school itself or a specialized placement", () => {
    expect(isAlternativeTo(mcclatchy, mcclatchy)).toBe(false);
    expect(isAlternativeTo(mcclatchy, legion)).toBe(false);
  });

  it("falls back to distance alone when the school's own span is unknown", () => {
    const unknown: School = { ...mcclatchy, gradesServed: undefined, gradesOffered: undefined };
    expect(isAlternativeTo(unknown, judah)).toBe(true);
    // A candidate with no span cannot be shown to serve the same grades.
    expect(
      isAlternativeTo(mcclatchy, { ...sacHigh, gradesServed: undefined, gradesOffered: undefined }),
    ).toBe(false);
  });
});

describe("NEARBY_RADII_MILES", () => {
  it("grows steadily, so no step multiplies the area read by more than about three", () => {
    for (let i = 1; i < NEARBY_RADII_MILES.length; i += 1) {
      const ratio = NEARBY_RADII_MILES[i] / NEARBY_RADII_MILES[i - 1];
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThanOrEqual(2);
    }
  });
});
