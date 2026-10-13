import "@testing-library/jest-dom/vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(axeMatchers);

// Vitest does not auto-clean rendered DOM without globals; do it here.
afterEach(() => cleanup());

// Unit tests run on the bundled sample data and never reach a backend. The app reads Convex
// whenever it has an address, so make sure none leaks in from the shell that started the run.
process.env.CONVEX_URL = "";
process.env.NEXT_PUBLIC_CONVEX_URL = "";
