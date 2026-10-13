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
  // One notification however many of the two values moved.
  const recentChanged = new URLSearchParams(next).has("address") && writeRecentSearch(next);
  const lastChanged = !(loaded && next === value);
  if (lastChanged) {
    loaded = true;
    value = next;
    try {
      if (next) window.sessionStorage.setItem(KEY, next);
      else window.sessionStorage.removeItem(KEY);
    } catch {
      // Storage unavailable: the value above still serves this page's lifetime.
    }
  }
  if (lastChanged || recentChanged) for (const listener of [...listeners]) listener();
}

/**
 * The most recent search that actually searched for something. Unlike the
 * value above it is not cleared by returning to the blank home screen, and it
 * is kept in local storage, so the home screen can offer it on the next visit.
 */
const RECENT_KEY = "school-finder:recent-search:v1";
let recent = "";
let recentLoaded = false;

export function getRecentSearchSnapshot(): string {
  if (typeof window === "undefined") return "";
  if (!recentLoaded) {
    recentLoaded = true;
    try {
      recent = clean(window.localStorage.getItem(RECENT_KEY));
    } catch {
      // Storage unavailable: remember in memory only.
    }
  }
  return recent;
}

/** Returns true when the value changed. The caller notifies subscribers. */
function writeRecentSearch(query: string): boolean {
  if (getRecentSearchSnapshot() === query) return false;
  recent = query;
  try {
    window.localStorage.setItem(RECENT_KEY, query);
  } catch {
    // Storage unavailable: the value above still serves this page's lifetime.
  }
  return true;
}

/** Test helper: forget everything. */
export function resetLastSearchForTests(): void {
  value = "";
  loaded = false;
  recent = "";
  recentLoaded = false;
  listeners.clear();
  try {
    window.localStorage.removeItem(RECENT_KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export const LAST_SEARCH_STORAGE_KEY = KEY;
