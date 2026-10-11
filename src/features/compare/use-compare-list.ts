"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { MAX_COMPARE, parseCompareParams, type CdsCode } from "@/lib/schemas";

/**
 * The compare list is the `compare` query parameter: a comma-separated list
 * of CDS codes, at most MAX_COMPARE. It lives in the URL so a search or a
 * comparison can be shared by copying the address bar.
 *
 * Writes use the History API, which Next.js syncs with `useSearchParams`,
 * so toggling never triggers a navigation or a server round trip. Any
 * component using this hook must render inside a <Suspense> boundary
 * because `useSearchParams` is runtime data under Cache Components.
 */
/** Search context carried on cross-page links alongside the compare list. */
const HOME_KEYS = ["address", "lat", "lng", "radius"] as const;

export function useCompareList() {
  const searchParams = useSearchParams();
  const list = useMemo(() => parseCompareParams(searchParams).compare, [searchParams]);

  const write = useCallback(
    (next: readonly string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.length) params.set("compare", next.join(","));
      else params.delete("compare");
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      // State must be null (or a plain object): Next treats a call that carries
      // its own `__NA` marker as internal and would not sync `useSearchParams`.
      window.history.replaceState(null, "", url);
    },
    [searchParams],
  );

  const has = useCallback((cds: CdsCode) => list.includes(cds), [list]);
  const isFull = list.length >= MAX_COMPARE;

  const add = useCallback(
    (cds: CdsCode) => {
      if (list.includes(cds) || list.length >= MAX_COMPARE) return;
      write([...list, cds]);
    },
    [list, write],
  );

  const remove = useCallback((cds: CdsCode) => write(list.filter((c) => c !== cds)), [list, write]);

  const toggle = useCallback(
    (cds: CdsCode) => (list.includes(cds) ? remove(cds) : add(cds)),
    [list, add, remove],
  );

  const clear = useCallback(() => write([]), [write]);

  /**
   * Query string to append to a link so the visitor's context survives
   * navigation: the compare list, plus the home address and coordinates when a
   * search has been run. Detail and compare pages use the coordinates to show
   * distance from home. Example: `?compare=a,b&address=...&lat=..&lng=..`.
   */
  const query = useMemo(() => {
    const parts: string[] = [];
    if (list.length) parts.push(`compare=${list.join(",")}`);
    for (const key of HOME_KEYS) {
      const value = searchParams.get(key);
      if (value) parts.push(`${key}=${encodeURIComponent(value)}`);
    }
    return parts.length ? `?${parts.join("&")}` : "";
  }, [list, searchParams]);

  return { list, has, add, remove, toggle, clear, isFull, max: MAX_COMPARE, query };
}
