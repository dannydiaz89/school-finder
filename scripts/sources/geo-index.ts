import { internal } from "../../convex/_generated/api";
import type { Source } from "./types";

/** Re-insert every school with coordinates into the spatial index, a page at a time. */
export const geoIndex: Source = {
  name: "geo-index",
  defaultYear: "",
  async run(ctx) {
    if (ctx.dryRun) {
      ctx.log("dry run: would rebuild the geospatial index");
      return { rowsRead: 0, rowsRejected: 0, rowsWritten: 0 };
    }
    let cursor: string | null = null;
    let indexed = 0;
    let pages = 0;
    do {
      const result: { indexed: number; cursor: string | null } = await ctx.client.mutation(
        internal.imports.rebuildGeoIndex,
        { cursor, pageSize: 100 },
      );
      indexed += result.indexed;
      cursor = result.cursor;
      pages += 1;
      if (pages % 10 === 0) ctx.log(`  indexed ${indexed} schools`);
    } while (cursor !== null);
    ctx.log(`== geo-index: indexed ${indexed} schools in ${pages} pages`);
    return { rowsRead: indexed, rowsRejected: 0, rowsWritten: indexed };
  },
};
