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
    NEXT_PUBLIC_CONVEX_URL: z.url().optional(),
    CONVEX_DEPLOYMENT: z.string().optional(),
  })
  .refine((e) => e.DATA_SOURCE !== "convex" || e.NEXT_PUBLIC_CONVEX_URL, {
    message: "NEXT_PUBLIC_CONVEX_URL is required when DATA_SOURCE=convex",
    path: ["NEXT_PUBLIC_CONVEX_URL"],
  });

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (!cached) {
    cached = ServerEnv.parse({
      NODE_ENV: process.env.NODE_ENV,
      DATA_SOURCE: process.env.DATA_SOURCE,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    });
  }
  return cached;
}

/** Test helper: forget the cached value so a test can set different variables. */
export function resetEnvForTests() {
  cached = undefined;
}
