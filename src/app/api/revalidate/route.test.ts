import { describe, expect, it } from "vitest";
import { isAuthorized } from "./route";

describe("revalidate authorization", () => {
  const secret = "a-long-enough-secret-value";
  it("accepts the exact bearer secret only", () => {
    expect(isAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorized(secret, secret)).toBe(true);
    expect(isAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isAuthorized("Bearer wrong", secret)).toBe(false);
    expect(isAuthorized("", secret)).toBe(false);
    expect(isAuthorized(null, secret)).toBe(false);
  });
});
