import { z } from "zod";

/**
 * The last search this tab showed, as the search page's query string.
 *
 * Results live in the page address, so a link that does not carry the address
 * (the header's Search link from the compare page, for one) used to land on
 * an empty search. Kept here, the header can lead back to the results.
 *
 * Session storage on purpose: it belongs to this tab's visit and is gone when
 * the tab closes, so a new visit starts with an empty search box.
 */

const KEY = "school-finder:last-search:v1";
const Stored = z.string().max(2000);

let value = "";
let loaded = false;
const listeners = new Set<() => void>();

/** A well-formed query string without the legacy `compare` parameter, or "" when unusable. */
function clean(text: string | null): string {
  const parsed = Stored.safeParse(text ?? "");
  if (!parsed.success) return "";
  const params = new URLSearchParams(parsed.data);
  params.delete("compare");
  return params.toString();
}

export function getLastSearchSnapshot(): string {
  if (typeof window === "undefined") return "";
  if (!loaded) {
    loaded = true;
    try {
      value = clean(window.sessionStorage.getItem(KEY));
    } catch {
      // Storage unavailable: remember in memory only.
    }
  }
  return value;
}

/** During server rendering the last search is unknown; the link settles once the page is live. */
export function getLastSearchServerSnapshot(): string {
  return "";
}

export function subscribeToLastSearch(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Record what the search page is showing now. An empty string means a blank search. */
export function writeLastSearch(query: string): void {
  const next = clean(query);
  if (loaded && next === value) return;
  loaded = true;
  value = next;
  try {
    if (next) window.sessionStorage.setItem(KEY, next);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage unavailable: the value above still serves this page's lifetime.
  }
  for (const listener of [...listeners]) listener();
}

/** Test helper: forget everything. */
export function resetLastSearchForTests(): void {
  value = "";
  loaded = false;
  listeners.clear();
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export const LAST_SEARCH_STORAGE_KEY = KEY;
