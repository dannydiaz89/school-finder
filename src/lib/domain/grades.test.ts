import { describe, expect, it } from "vitest";
import { parseGradeSpan, spanIncludes, spanOverlapsBand } from "./grades";

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
