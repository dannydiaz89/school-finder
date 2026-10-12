"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MAX_COMPARE, type CdsCode } from "@/lib/schemas";
import {
  getCompareServerSnapshot,
  getCompareSnapshot,
  subscribeToCompare,
  writeCompareList,
} from "./store";

/** Search context carried on cross-page links alongside the compare list. */
const HOME_KEYS = ["address", "loc", "lat", "lng", "radius"] as const;

const noSubscription = () => () => {};

/**
 * The compare list: up to MAX_COMPARE schools, kept in this browser (see
 * `store.ts`), so it survives a new search, a reload, or any link.
 *
 * Every change reads the list as it is at that moment rather than as it was
 * when the component last rendered, so two quick clicks never undo each other.
 *
 * Components using this must render inside a <Suspense> boundary: it also
 * reads the URL (runtime data under Cache Components) to carry the visitor's
 * search location on links.
 */
export function useCompareList() {
  const searchParams = useSearchParams();
  const list = useSyncExternalStore(
    subscribeToCompare,
    getCompareSnapshot,
    getCompareServerSnapshot,
  );
  /** False while rendering on the server and while hydrating, when the list is not known yet. */
  const ready = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const has = useCallback((cds: CdsCode) => list.includes(cds), [list]);
  const isFull = list.length >= MAX_COMPARE;

  const add = useCallback((cds: CdsCode) => {
    const current = getCompareSnapshot();
    if (current.includes(cds) || current.length >= MAX_COMPARE) return;
    writeCompareList([...current, cds]);
  }, []);

  const remove = useCallback((cds: CdsCode) => {
    writeCompareList(getCompareSnapshot().filter((c) => c !== cds));
  }, []);

  const toggle = useCallback(
    (cds: CdsCode) => (getCompareSnapshot().includes(cds) ? remove(cds) : add(cds)),
    [add, remove],
  );

  const clear = useCallback(() => writeCompareList([]), []);

  /** Replace the whole list, for a link that names a specific comparison. */
  const set = useCallback((next: readonly CdsCode[]) => writeCompareList(next), []);

  /**
   * Query string for links: the compare list, plus the search location when a
   * search has been run, which detail and compare pages use to show distance.
   * The compare page reads the list from here; elsewhere it is along for the
   * ride. Example: `?compare=a,b&address=...&lat=..&lng=..`.
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

  return { list, ready, has, add, remove, toggle, clear, set, isFull, max: MAX_COMPARE, query };
}
