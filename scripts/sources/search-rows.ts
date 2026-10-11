import { internal } from "../../convex/_generated/api";
import type { Source } from "./types";

/**
 * Recompute the search summary stored on every school. Runs automatically at
 * the end of any import, because Dashboard rows, enrollment, staff ratios and
 * private school details all feed it.
 */
export const searchRows: Source = {
  name: "search-rows",
  defaultYear: "",
  async run(ctx) {
    if (ctx.dryRun) {
      ctx.log("dry run: would rebuild the stored search summaries");
      return { rowsRead: 0, rowsRejected: 0, rowsWritten: 0 };
    }
    let cursor: string | null = null;
    let updated = 0;
    let pages = 0;
    do {
      const result: { updated: number; cursor: string | null } = await ctx.client.mutation(
        internal.imports.rebuildSummaries,
        { cursor, pageSize: 100 },
      );
      updated += result.updated;
      cursor = result.cursor;
      pages += 1;
      if (pages % 20 === 0) ctx.log(`  summarized ${updated} schools`);
    } while (cursor !== null);
    ctx.log(`== search-rows: summarized ${updated} schools in ${pages} pages`);
    return { rowsRead: updated, rowsRejected: 0, rowsWritten: updated };
  },
};
