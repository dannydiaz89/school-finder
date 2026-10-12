import { z } from "zod";
import { CdsCode, MAX_COMPARE } from "@/lib/schemas";

/**
 * Where the compare list lives: this browser's local storage.
 *
 * It used to live only in the page address, which meant any navigation that
 * did not carry the `compare` parameter forward (typing a new search, the
 * header links, a bookmark) silently emptied it. Stored here it survives every
 * navigation, a reload, and a new tab. The address still carries the list on
 * the compare page, so a comparison can be shared by copying the link.
 *
 * Framework-free on purpose: a tiny external store read with
 * `useSyncExternalStore`.
 */

const KEY = "school-finder:compare:v1";
const EMPTY: readonly CdsCode[] = Object.freeze([]);
const Stored = z.array(CdsCode);

let raw: string | null | undefined;
let value: readonly CdsCode[] = EMPTY;
/** True once storage has refused a write (private mode, quota); the list then lives in memory only. */
let memoryOnly = false;
const listeners = new Set<() => void>();

function clean(list: readonly string[]): readonly CdsCode[] {
  const parsed = Stored.safeParse([...new Set(list)]);
  if (!parsed.success || parsed.data.length === 0) return EMPTY;
  return parsed.data.slice(0, MAX_COMPARE);
}

function parse(text: string | null): readonly CdsCode[] {
  if (!text) return EMPTY;
  try {
    const json: unknown = JSON.parse(text);
    return Array.isArray(json)
      ? clean(json.filter((x): x is string => typeof x === "string"))
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** The current list. Returns the same array until the list changes, as `useSyncExternalStore` requires. */
export function getCompareSnapshot(): readonly CdsCode[] {
  if (typeof window === "undefined" || memoryOnly) return value;
  let text: string | null = null;
  try {
    text = window.localStorage.getItem(KEY);
  } catch {
    return value;
  }
  if (text !== raw) {
    raw = text;
    value = parse(text);
  }
  return value;
}

/** During server rendering the list is unknown; components show it once the page is live. */
export function getCompareServerSnapshot(): readonly CdsCode[] {
  return EMPTY;
}

export function subscribeToCompare(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the list.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Replace the list. Duplicates, invalid codes, and anything past the maximum are dropped. */
export function writeCompareList(next: readonly string[]): void {
  const list = clean(next);
  const text = list.length ? JSON.stringify(list) : null;
  try {
    if (text === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, text);
  } catch {
    memoryOnly = true;
  }
  raw = text;
  value = list;
  for (const listener of [...listeners]) listener();
}

/**
 * The address this document was loaded at. A compare link opened directly
 * (pasted, bookmarked, shared) should show that comparison; the same address
 * reached again by Back should not undo what was added since.
 */
const loadedAt = typeof window === "undefined" ? null : window.location.href;
let openedLinkHandled = false;

/** True once, on the compare page the document was opened at. */
export function takeOpenedCompareLink(): boolean {
  if (openedLinkHandled || typeof window === "undefined") return false;
  openedLinkHandled = true;
  if (loadedAt !== window.location.href) return false;
  // A document restored by Back or Forward is an old address, not a link someone just opened.
  const [entry] = window.performance?.getEntriesByType?.("navigation") ?? [];
  return (entry as PerformanceNavigationTiming | undefined)?.type !== "back_forward";
}

/** Test helper: forget everything. */
export function resetCompareStoreForTests(openedLink = false): void {
  raw = undefined;
  value = EMPTY;
  memoryOnly = false;
  openedLinkHandled = !openedLink;
  listeners.clear();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export const COMPARE_STORAGE_KEY = KEY;
