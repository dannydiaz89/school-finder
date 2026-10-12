import { CdsCode, MAX_SAVED_SCHOOLS, SavedSchoolList, type SavedSchool } from "@/lib/schemas";

/**
 * Where the My schools list lives.
 *
 * Today that is this browser's local storage: no account, nothing sent
 * anywhere. Everything else in the feature talks to the `SavedSchoolsStore`
 * interface below and never to storage directly, so moving the list to an
 * account later means writing a second implementation of this interface
 * (reads and writes going to the server) and handing it to `useMySchools`.
 * Each entry keeps the time it was added so that, on first sign-in, the list
 * made in a browser can be merged with one already on the account.
 */
export interface SavedSchoolsStore {
  /** The current list. Must return the same array until the list changes. */
  getSnapshot(): readonly SavedSchool[];
  /** What to render before the list can be known (server render, hydration). */
  getServerSnapshot(): readonly SavedSchool[];
  subscribe(listener: () => void): () => void;
  /** Replace the list. */
  write(next: readonly SavedSchool[]): void;
}

const KEY = "school-finder:my-schools:v1";
const EMPTY: readonly SavedSchool[] = Object.freeze([]);

let raw: string | null | undefined;
let value: readonly SavedSchool[] = EMPTY;
/** True once storage has refused a write (private mode, quota); the list then lives in memory only. */
let memoryOnly = false;
const listeners = new Set<() => void>();

/** One entry per school, valid codes only, never more than the maximum. */
function clean(list: readonly SavedSchool[]): readonly SavedSchool[] {
  const seen = new Set<string>();
  const out: SavedSchool[] = [];
  for (const entry of list) {
    if (!CdsCode.safeParse(entry.cds).success || seen.has(entry.cds)) continue;
    seen.add(entry.cds);
    out.push(entry);
  }
  return out.length ? out.slice(0, MAX_SAVED_SCHOOLS) : EMPTY;
}

function parse(text: string | null): readonly SavedSchool[] {
  if (!text) return EMPTY;
  try {
    const parsed = SavedSchoolList.safeParse(JSON.parse(text));
    return parsed.success ? clean(parsed.data.schools) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): readonly SavedSchool[] {
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

function subscribe(listener: () => void): () => void {
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

function write(next: readonly SavedSchool[]): void {
  const list = clean(next);
  const stored: SavedSchoolList = { version: 1, schools: [...list] };
  const text = list.length ? JSON.stringify(stored) : null;
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

/** The list kept in this browser. */
export const browserSavedSchools: SavedSchoolsStore = {
  getSnapshot,
  getServerSnapshot: () => EMPTY,
  subscribe,
  write,
};

/** Test helper: forget everything. */
export function resetMySchoolsStoreForTests(): void {
  raw = undefined;
  value = EMPTY;
  memoryOnly = false;
  listeners.clear();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

export const MY_SCHOOLS_STORAGE_KEY = KEY;
