import { afterEach, describe, expect, it, vi } from "vitest";
import { convexUrl, getEnv, resetEnvForTests } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

const set = (values: Record<string, string>) => {
  vi.stubEnv("CONVEX_URL", "");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
};

describe("server environment", () => {
  it("has no Convex address by default, which means the bundled sample data", () => {
    set({});
    expect(convexUrl()).toBeUndefined();
  });

  it("takes the address read at startup, as a container passes it", () => {
    set({ CONVEX_URL: "https://example-123.convex.cloud" });
    expect(convexUrl()).toBe("https://example-123.convex.cloud");
  });

  it("falls back to the address fixed at build time, and prefers the startup one", () => {
    set({ NEXT_PUBLIC_CONVEX_URL: "https://built-in.convex.cloud" });
    expect(convexUrl()).toBe("https://built-in.convex.cloud");
    set({
      NEXT_PUBLIC_CONVEX_URL: "https://built-in.convex.cloud",
      CONVEX_URL: "https://at-startup.convex.cloud",
    });
    expect(convexUrl()).toBe("https://at-startup.convex.cloud");
  });

  it("treats an empty value as not set", () => {
    // Compose passes an empty string for an unset variable, and the browser tests blank
    // the address to run on sample data on a machine whose .env.local names a deployment.
    set({ CONVEX_URL: "", NEXT_PUBLIC_CONVEX_URL: "", REVALIDATE_SECRET: "" });
    expect(convexUrl()).toBeUndefined();
    expect(getEnv().REVALIDATE_SECRET).toBeUndefined();
  });

  it("rejects an address that is not a URL, naming the setting", () => {
    // A deployment's name alone is not its address.
    set({ CONVEX_URL: "example-deployment-123" });
    expect(() => getEnv()).toThrow(/CONVEX_URL/);
  });

  it("ignores a leftover DATA_SOURCE, which is no longer a setting", () => {
    set({ DATA_SOURCE: "fixtures", CONVEX_URL: "https://example-123.convex.cloud" });
    expect(convexUrl()).toBe("https://example-123.convex.cloud");
    expect(getEnv()).not.toHaveProperty("DATA_SOURCE");
  });
});
