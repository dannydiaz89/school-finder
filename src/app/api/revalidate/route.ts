import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { SCHOOLS_CACHE_TAG } from "@/lib/data/cached";
import { getEnv } from "@/lib/schemas/env";

/**
 * Drop every cached school result. The import script calls this when it
 * finishes, so pages show new data at once instead of after the cache
 * lifetime runs out.
 *
 *   POST /api/revalidate   Authorization: Bearer <REVALIDATE_SECRET>
 *
 * Without REVALIDATE_SECRET set the route does not exist.
 */
export function isAuthorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = getEnv().REVALIDATE_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  // Expire now: after an import, correct data matters more than a fast stale answer.
  revalidateTag(SCHOOLS_CACHE_TAG, { expire: 0 });
  return Response.json({ revalidated: SCHOOLS_CACHE_TAG });
}
