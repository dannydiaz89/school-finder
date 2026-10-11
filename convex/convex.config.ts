import { defineApp } from "convex/server";

// No components. Radius search uses a plain grid index on the schools table
// (src/lib/domain/grid.ts) rather than a spatial-index component.
const app = defineApp();

export default app;
