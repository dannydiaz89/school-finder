import { NextResponse, type NextRequest } from "next/server";
import { geocodeAddress, GeocodeError, GeocodeQuery } from "@/features/search/geocode";

/**
 * GET /api/geocode?q=<address>
 *
 * Turns an address into coordinates through the Census geocoder, server
 * side so the browser never talks to the geocoder directly. Returns a
 * `GeocodeResult`, or an error code: 400 `invalid_query`, 404 `not_found`,
 * 502 `upstream`. Reads the request URL, so it renders per request.
 */
export async function GET(request: NextRequest) {
  const parsed = GeocodeQuery.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const result = await geocodeAddress(parsed.data);
    if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    // Log the failure class only; the query is personal data.
    const reason = error instanceof GeocodeError ? error.message : "unexpected error";
    console.error(`[geocode] ${reason}`);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
