import { afterEach, describe, expect, it, vi } from "vitest";
import { convexUrl, getEnv, resetEnvForTests } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

const set = (values: Record<string, string>) => {
  vi.stubEnv("DATA_SOURCE", "");
  vi.stubEnv("CONVEX_URL", "");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
};

describe("server environment", () => {
  it("defaults to the bundled sample data, which needs no backend", () => {
    set({});
    expect(getEnv().DATA_SOURCE).toBe("fixtures");
    expect(convexUrl()).toBeUndefined();
  });

  it("takes the Convex address read at startup, as a container passes it", () => {
    set({ DATA_SOURCE: "convex", CONVEX_URL: "https://example-123.convex.cloud" });
    expect(convexUrl()).toBe("https://example-123.convex.cloud");
  });

  it("falls back to the address fixed at build time, and prefers the startup one", () => {
    set({ DATA_SOURCE: "convex", NEXT_PUBLIC_CONVEX_URL: "https://built-in.convex.cloud" });
    expect(convexUrl()).toBe("https://built-in.convex.cloud");
    set({
      DATA_SOURCE: "convex",
      NEXT_PUBLIC_CONVEX_URL: "https://built-in.convex.cloud",
      CONVEX_URL: "https://at-startup.convex.cloud",
    });
    expect(convexUrl()).toBe("https://at-startup.convex.cloud");
  });

  it("refuses to start on Convex without an address, and says which setting is missing", () => {
    set({ DATA_SOURCE: "convex" });
    expect(() => getEnv()).toThrow(/CONVEX_URL/);
  });

  it("treats an empty value as not set, as Compose passes for an unset variable", () => {
    set({ DATA_SOURCE: "fixtures", CONVEX_URL: "", REVALIDATE_SECRET: "" });
    expect(getEnv().CONVEX_URL).toBeUndefined();
    expect(getEnv().REVALIDATE_SECRET).toBeUndefined();
  });
});
