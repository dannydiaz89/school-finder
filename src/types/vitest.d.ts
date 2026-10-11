import "vitest";
import type { AxeMatchers } from "vitest-axe/matchers";

/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module "vitest" {
  interface Assertion extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
