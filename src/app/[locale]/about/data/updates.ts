import { z } from "zod";
import { fixtures } from "@/fixtures";
import { IsoDate } from "@/lib/schemas";

/** Latest retrieval date per source file URL. */
export const SourceUpdates = z.record(z.url(), IsoDate);
export type SourceUpdates = z.infer<typeof SourceUpdates>;

/**
 * Returns when each source file was last retrieved, keyed by its download URL
 * (the `fileUrl` in `sources.ts`).
 *
 * Today this reads the manifest baked into the fixture file, so the page is
 * fully static. When the Data workstream lands the `importRuns` table, replace
 * the body with a query for the newest run per source URL; the table component
 * only depends on this function's return shape.
 */
export async function getSourceUpdates(): Promise<SourceUpdates> {
  const entries = fixtures.sources.map((s) => [s.url, s.retrievedAt] as const);
  return SourceUpdates.parse(Object.fromEntries(entries));
}
