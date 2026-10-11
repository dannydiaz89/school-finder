import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

const shared = {
  plugins: [react()],
  resolve: {
    alias: {
      "@": src,
      // `server-only` throws outside React Server Components; tests import server modules freely.
      "server-only": `${src}/test/empty.ts`,
    },
  },
};

export default defineConfig({
  ...shared,
  test: {
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // next-intl's client build imports next/navigation; inline it so jsdom tests can render Link.
    server: { deps: { inline: ["next-intl"] } },
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "convex/**/*.test.ts", "scripts/**/*.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        ...shared,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
