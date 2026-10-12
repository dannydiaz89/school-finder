import { z } from "zod";

/**
 * Shapes of responses from services we do not control. These use
 * `.passthrough()` on purpose: extra fields must not break parsing.
 */

/** US Census Bureau geocoder, onelineaddress endpoint. */
export const CensusGeocodeResponse = z
  .object({
    result: z
      .object({
        addressMatches: z.array(
          z
            .object({
              matchedAddress: z.string(),
              coordinates: z.object({ x: z.number(), y: z.number() }).passthrough(),
              addressComponents: z
                .object({
                  city: z.string().optional(),
                  state: z.string().optional(),
                  zip: z.string().optional(),
                })
                .passthrough()
                .optional(),
            })
            .passthrough(),
        ),
      })
      .passthrough(),
  })
  .passthrough();
export type CensusGeocodeResponse = z.infer<typeof CensusGeocodeResponse>;

/** What our own geocode route returns to the client. */
export const GeocodeResult = z
  .object({
    query: z.string(),
    matchedAddress: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    state: z.string().optional(),
    /** What the query resolved to. A city or ZIP code resolves to its center point. */
    kind: z.enum(["address", "city", "zip"]).default("address"),
  })
  .strict();
export type GeocodeResult = z.infer<typeof GeocodeResult>;
