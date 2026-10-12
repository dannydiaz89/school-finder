import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  censusUrl,
  clearGeocodeCacheForTests,
  geocodeAddress,
  GeocodeError,
  normalizeQuery,
} from "./geocode";

/** The real shape the Census geocoder returned for the fixture address on 2026-10-11. */
const MATCH_BODY = {
  result: {
    input: { address: { address: "1420 J Street, Sacramento, CA 95814" } },
    addressMatches: [
      {
        tigerLine: { side: "R", tigerLineId: "648489347" },
        coordinates: { x: -121.487664184898, y: 38.578705339532 },
        addressComponents: { zip: "95814", city: "SACRAMENTO", state: "CA" },
        matchedAddress: "1420 J ST, SACRAMENTO, CA, 95814",
      },
    ],
  },
};

const NO_MATCH_BODY = { result: { input: {}, addressMatches: [] } };

function stubFetch(body: unknown, init: { status?: number } = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: init.status ?? 200 }));
}

beforeEach(() => clearGeocodeCacheForTests());

describe("censusUrl", () => {
  it("encodes the address and asks for the current public benchmark as JSON", () => {
    const url = new URL(censusUrl("1420 J Street, Sacramento, CA 95814"));
    expect(url.origin + url.pathname).toBe(
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
    );
    expect(url.searchParams.get("address")).toBe("1420 J Street, Sacramento, CA 95814");
    expect(url.searchParams.get("benchmark")).toBe("Public_AR_Current");
    expect(url.searchParams.get("format")).toBe("json");
  });
});

describe("normalizeQuery", () => {
  it("collapses whitespace and case so equivalent queries share a cache entry", () => {
    expect(normalizeQuery("  1420   J St,\tSacramento ")).toBe("1420 j st, sacramento");
  });
});

describe("geocodeAddress", () => {
  it("returns the first match with x as longitude and y as latitude", async () => {
    const fetch = stubFetch(MATCH_BODY);
    const result = await geocodeAddress("1420 J Street, Sacramento, CA 95814", { fetch });
    expect(result).toEqual({
      query: "1420 J Street, Sacramento, CA 95814",
      matchedAddress: "1420 J ST, SACRAMENTO, CA, 95814",
      latitude: 38.578705339532,
      longitude: -121.487664184898,
      state: "CA",
      kind: "address",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("address=1420+J+Street");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("resolves a city from the bundled table without calling the geocoder", async () => {
    const fetch = stubFetch(MATCH_BODY);
    const result = await geocodeAddress("Sacramento, CA", { fetch });
    expect(result).toMatchObject({ kind: "city", matchedAddress: "Sacramento, CA", state: "CA" });
    expect(result?.latitude).toBeCloseTo(38.57, 1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves a ZIP code from the bundled table without calling the geocoder", async () => {
    const fetch = stubFetch(MATCH_BODY);
    const result = await geocodeAddress("95816", { fetch });
    expect(result).toMatchObject({ kind: "zip", matchedAddress: "95816" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers not found for a ZIP code outside California without calling the geocoder", async () => {
    const fetch = stubFetch(MATCH_BODY);
    expect(await geocodeAddress("10001", { fetch })).toBeNull();
    expect(await geocodeAddress("00000", { fetch })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("still sends a street address to the geocoder", async () => {
    const fetch = stubFetch(MATCH_BODY);
    const result = await geocodeAddress("915 L Street, Sacramento", { fetch, cache: false });
    expect(result?.kind).toBe("address");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when there is no match and caches that answer", async () => {
    const fetch = stubFetch(NO_MATCH_BODY);
    expect(await geocodeAddress("nowhere at all", { fetch })).toBeNull();
    expect(await geocodeAddress("  NOWHERE at   all ", { fetch })).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("serves a repeat query from the cache without fetching again", async () => {
    const fetch = stubFetch(MATCH_BODY);
    await geocodeAddress("1420 J Street, Sacramento, CA 95814", { fetch });
    await geocodeAddress("1420 j street, sacramento, ca 95814", { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("skips the cache when asked", async () => {
    const fetch = stubFetch(MATCH_BODY);
    await geocodeAddress("1420 J Street, Sacramento, CA 95814", { fetch, cache: false });
    await geocodeAddress("1420 J Street, Sacramento, CA 95814", { fetch, cache: false });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects queries shorter than 3 or longer than 200 characters before fetching", async () => {
    const fetch = stubFetch(MATCH_BODY);
    await expect(geocodeAddress("ab", { fetch })).rejects.toThrow();
    await expect(geocodeAddress("x".repeat(201), { fetch })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws GeocodeError on a non-2xx status, a malformed body, and a network failure", async () => {
    await expect(
      geocodeAddress("1420 J Street", { fetch: stubFetch(MATCH_BODY, { status: 503 }) }),
    ).rejects.toBeInstanceOf(GeocodeError);
    await expect(
      geocodeAddress("1420 J Street", { fetch: stubFetch({ result: "nope" }) }),
    ).rejects.toBeInstanceOf(GeocodeError);
    const failing = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(geocodeAddress("1420 J Street", { fetch: failing })).rejects.toBeInstanceOf(
      GeocodeError,
    );
  });

  it("does not cache a failure", async () => {
    await expect(
      geocodeAddress("1420 J Street", { fetch: stubFetch(MATCH_BODY, { status: 500 }) }),
    ).rejects.toThrow();
    const fetch = stubFetch(MATCH_BODY);
    expect(await geocodeAddress("1420 J Street", { fetch })).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("aborts after the timeout", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );
      const pending = geocodeAddress("1420 J Street", { fetch, timeoutMs: 50 });
      const assertion = expect(pending).rejects.toBeInstanceOf(GeocodeError);
      await vi.advanceTimersByTimeAsync(60);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
