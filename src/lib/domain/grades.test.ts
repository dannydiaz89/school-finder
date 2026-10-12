import { describe, expect, it } from "vitest";
import {
  parseGradeSpan,
  sameSpanIgnoringTk,
  servedSpan,
  spanIncludes,
  spanOverlapsBand,
  trimSpanToEnrollment,
} from "./grades";

describe("parseGradeSpan", () => {
  it.each([
    ["K-6", { low: "K", high: "6" }],
    ["P-5", { low: "P", high: "5" }],
    ["9-12", { low: "9", high: "12" }],
    ["K", { low: "K", high: "K" }],
    ["Adult", { low: "A", high: "A" }],
    ["P-Adult", { low: "P", high: "A" }],
    ["K–8", { low: "K", high: "8" }],
  ])("parses %s", (input, expected) => {
    expect(parseGradeSpan(input)).toEqual(expected);
  });

  it.each(["", "No", "No Data", "13-14", "6-K", undefined, null])("rejects %s", (input) => {
    expect(parseGradeSpan(input)).toBeUndefined();
  });
});

describe("spanIncludes", () => {
  it("is inclusive at both ends", () => {
    const span = { low: "K", high: "6" } as const;
    expect(spanIncludes(span, "K")).toBe(true);
    expect(spanIncludes(span, "6")).toBe(true);
    expect(spanIncludes(span, "7")).toBe(false);
    expect(spanIncludes(span, "P")).toBe(false);
  });
});

describe("trimSpanToEnrollment", () => {
  const counts = (grades: Record<string, number>) =>
    Object.entries(grades).map(([grade, count]) => ({ grade: grade as never, count }));

  it("drops listed end grades that have no students", () => {
    // Downey High: listed 8-12, students only in 9-12.
    expect(
      trimSpanToEnrollment(
        { low: "8", high: "12" },
        counts({ "9": 1113, "10": 1019, "11": 986, "12": 933 }),
      ),
    ).toEqual({ low: "9", high: "12" });
    // Vacaville High: listed 4-12.
    expect(
      trimSpanToEnrollment(
        { low: "4", high: "12" },
        counts({ "9": 500, "10": 500, "11": 500, "12": 544 }),
      ),
    ).toEqual({ low: "9", high: "12" });
    expect(
      trimSpanToEnrollment({ low: "K", high: "8" }, counts({ K: 40, "1": 42, "7": 30 })),
    ).toEqual({
      low: "K",
      high: "7",
    });
  });

  it("returns the same span when both ends have students", () => {
    const span = { low: "K", high: "6" } as const;
    expect(trimSpanToEnrollment(span, counts({ K: 60, "3": 55, "6": 50 }))).toBe(span);
  });

  it("never widens the span for a stray student outside it", () => {
    expect(
      trimSpanToEnrollment({ low: "9", high: "12" }, counts({ "8": 1, "9": 300, "12": 280 })),
    ).toEqual({ low: "9", high: "12" });
  });

  it("counts transitional kindergarten as kindergarten", () => {
    expect(
      trimSpanToEnrollment({ low: "K", high: "5" }, counts({ TK: 20, "1": 40, "5": 38 })),
    ).toEqual({
      low: "K",
      high: "5",
    });
  });

  it("leaves preschool and adult ends alone, and a school with no counted students", () => {
    expect(trimSpanToEnrollment({ low: "P", high: "6" }, counts({ K: 30, "5": 28 }))).toEqual({
      low: "P",
      high: "5",
    });
    expect(trimSpanToEnrollment({ low: "9", high: "A" }, counts({ "10": 12 }))).toEqual({
      low: "10",
      high: "A",
    });
    const span = { low: "K", high: "8" } as const;
    expect(trimSpanToEnrollment(span, [])).toBe(span);
    expect(trimSpanToEnrollment(span, counts({ K: 0, "1": 0 }))).toBe(span);
  });
});

describe("servedSpan", () => {
  const counts = (grades: Record<string, number>) =>
    Object.entries(grades).map(([grade, count]) => ({ grade: grade as never, count }));

  it("starts at TK when transitional kindergarten students are enrolled", () => {
    // Murphy Ranch Elementary: listed K-5, 24 TK students on Census Day.
    expect(
      servedSpan({ low: "K", high: "5" }, counts({ TK: 24, K: 42, "1": 72, "5": 98 })),
    ).toEqual({ low: "TK", high: "5" });
  });

  it("still trims the ends, and keeps the same object when nothing changes", () => {
    expect(servedSpan({ low: "8", high: "12" }, counts({ "9": 1113, "12": 933 }))).toEqual({
      low: "9",
      high: "12",
    });
    const span = { low: "K", high: "6" } as const;
    expect(servedSpan(span, counts({ K: 60, "6": 50 }))).toBe(span);
    expect(servedSpan(span, counts({ TK: 0, K: 60, "6": 50 }))).toBe(span);
  });

  it("leaves a span that does not start at kindergarten alone", () => {
    expect(servedSpan({ low: "P", high: "5" }, counts({ TK: 20, K: 30, "5": 28 }))).toEqual({
      low: "P",
      high: "5",
    });
  });

  it("matches the TK-K filter band", () => {
    expect(spanOverlapsBand({ low: "TK", high: "5" }, "tk")).toBe(true);
    expect(spanOverlapsBand({ low: "TK", high: "5" }, "elementary")).toBe(true);
  });
});

describe("sameSpanIgnoringTk", () => {
  it("reads TK as kindergarten at the low end", () => {
    expect(sameSpanIgnoringTk({ low: "TK", high: "5" }, { low: "K", high: "5" })).toBe(true);
    expect(sameSpanIgnoringTk({ low: "TK", high: "5" }, { low: "K", high: "6" })).toBe(false);
    expect(sameSpanIgnoringTk({ low: "9", high: "12" }, { low: "8", high: "12" })).toBe(false);
  });
});

describe("spanOverlapsBand", () => {
  it("matches an elementary school to the TK-K and elementary bands only", () => {
    const span = { low: "K", high: "6" } as const;
    expect(spanOverlapsBand(span, "tk")).toBe(true);
    expect(spanOverlapsBand(span, "elementary")).toBe(true);
    expect(spanOverlapsBand(span, "middle")).toBe(true);
    expect(spanOverlapsBand(span, "high")).toBe(false);
  });

  it("matches a K-5 school to elementary but not middle", () => {
    const span = { low: "K", high: "5" } as const;
    expect(spanOverlapsBand(span, "middle")).toBe(false);
  });

  it("does not match a preschool-only site to TK-K", () => {
    expect(spanOverlapsBand({ low: "P", high: "P" }, "tk")).toBe(false);
  });
});
