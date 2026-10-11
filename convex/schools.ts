import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomQuery } from "convex-helpers/server/zod4";
import { query } from "./_generated/server";
import { GetSchoolArgs, GetSchoolsByCdsArgs, NearbyArgs, SearchArgs } from "../src/lib/schemas";

/**
 * Thin public queries behind src/lib/data/convex.ts. Arguments are validated
 * with the shared Zod schemas. Bodies must stay small: look up documents,
 * then hand them to pure functions in src/lib/domain.
 *
 * Stage 0 leaves these as stubs. The Data workstream fills them in and must
 * keep the signatures identical.
 */

const zQuery = zCustomQuery(query, NoOp);

export const search = zQuery({
  args: SearchArgs.shape,
  handler: async () => {
    return {
      schools: [],
      total: 0,
      countsByType: { district: 0, charter: 0, private: 0 },
      hiddenSpecialized: 0,
    };
  },
});

export const get = zQuery({
  args: GetSchoolArgs.shape,
  handler: async () => {
    return null;
  },
});

export const nearby = zQuery({
  args: NearbyArgs.shape,
  handler: async () => {
    return [];
  },
});

export const byCds = zQuery({
  args: GetSchoolsByCdsArgs.shape,
  handler: async () => {
    return [];
  },
});
