import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Spatial index over schools. Key is the schools document id. Filter keys
 * let the radius query narrow by type before loading documents.
 */
export const schoolIndex = new GeospatialIndex<Id<"schools">, { type: string }>(
  components.geospatial,
);
