import { z } from "zod";

/**
 * Environment variables, parsed once. Import `env` instead of reading
 * `process.env` directly so a missing or malformed value fails at startup
 * with a clear message rather than deep inside a request.
 */

const DataSource = z.enum(["fixtures", "convex"]);

const ServerEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATA_SOURCE: DataSource.default("fixtures"),
    /**
     * The Convex deployment's address, read when the server starts. Use this
     * one in a container: an image built once can then be pointed at any
     * deployment.
     */
    CONVEX_URL: z.url().optional(),
    /**
     * The same address under the name `npx convex dev` writes to .env.local.
     * Next.js copies `NEXT_PUBLIC_` values into the build, so this one is
     * fixed when the app is built. `CONVEX_URL` wins when both are set.
     */
    NEXT_PUBLIC_CONVEX_URL: z.url().optional(),
    CONVEX_DEPLOYMENT: z.string().optional(),
    /** Lets the import script clear cached pages through POST /api/revalidate. */
    REVALIDATE_SECRET: z.string().min(16).optional(),
  })
  .refine((e) => e.DATA_SOURCE !== "convex" || e.CONVEX_URL || e.NEXT_PUBLIC_CONVEX_URL, {
    message: "CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) is required when DATA_SOURCE=convex",
    path: ["CONVEX_URL"],
  });

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (!cached) {
    cached = ServerEnv.parse({
      NODE_ENV: process.env.NODE_ENV,
      DATA_SOURCE: process.env.DATA_SOURCE || undefined,
      // An empty value, as Compose passes for an unset variable, means "not set".
      CONVEX_URL: process.env.CONVEX_URL || undefined,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL || undefined,
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
      REVALIDATE_SECRET: process.env.REVALIDATE_SECRET || undefined,
    });
  }
  return cached;
}

/** The Convex deployment to talk to, or undefined when none is configured. */
export function convexUrl(env: ServerEnv = getEnv()): string | undefined {
  return env.CONVEX_URL ?? env.NEXT_PUBLIC_CONVEX_URL;
}

/** Test helper: forget the cached value so a test can set different variables. */
export function resetEnvForTests() {
  cached = undefined;
}
