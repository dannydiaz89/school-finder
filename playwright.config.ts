import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke suite. Runs against the production build on port 3103
 * with the fixtures backend, so it needs no network and no Convex.
 *
 * - Locally, `pnpm e2e` builds and starts the app for you. To test an app you
 *   already have running, set PLAYWRIGHT_BASE_URL.
 * - In CI the workflow builds first and the config only starts the server.
 */

const PORT = 3103;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: isCI ? `pnpm start -p ${PORT}` : `pnpm build && pnpm start -p ${PORT}`,
        url: `${baseURL}/en`,
        reuseExistingServer: !isCI,
        timeout: 240_000,
        env: { ...process.env, DATA_SOURCE: "fixtures" },
      },
});
