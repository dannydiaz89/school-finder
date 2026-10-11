import { describe, expect, it } from "vitest";
import { SearchResult } from "./api";

describe("SearchResult", () => {
  it("accepts a result from a backend that predates the truncated flag", () => {
    const older = {
      schools: [],
      total: 0,
      countsByType: { district: 0, charter: 0, private: 0 },
      hiddenSpecialized: 0,
    };
    expect(SearchResult.parse(older).truncated).toBe(false);
  });

  it("still rejects unknown fields", () => {
    const result = SearchResult.safeParse({
      schools: [],
      total: 0,
      countsByType: { district: 0, charter: 0, private: 0 },
      hiddenSpecialized: 0,
      truncated: true,
      surprise: 1,
    });
    expect(result.success).toBe(false);
  });
});
