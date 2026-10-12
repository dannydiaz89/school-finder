"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MAX_SAVED_SCHOOLS, type CdsCode } from "@/lib/schemas";
import { browserSavedSchools, type SavedSchoolsStore } from "./store";

const noSubscription = () => () => {};

/** Address of the My schools page for a list: the codes ride along so the server can load them. */
export function mySchoolsHref(list: readonly CdsCode[]): string {
  return list.length ? `/my-schools?schools=${list.join(",")}` : "/my-schools";
}

/**
 * The My schools list: schools a visitor chose to keep an eye on.
 *
 * This hook is the only thing components use. It reads and writes through a
 * `SavedSchoolsStore`, which today is the browser's own storage; an account
 * based store can be passed here later without touching any component.
 *
 * Every change reads the list as it is at that moment rather than as it was
 * when the component last rendered, so two quick clicks never undo each other.
 */
export function useMySchools(store: SavedSchoolsStore = browserSavedSchools) {
  const saved = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  /** False while rendering on the server and while hydrating, when the list is not known yet. */
  const ready = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  const list = useMemo(() => saved.map((entry) => entry.cds), [saved]);
  const has = useCallback((cds: CdsCode) => list.includes(cds), [list]);
  const isFull = saved.length >= MAX_SAVED_SCHOOLS;

  const add = useCallback(
    (cds: CdsCode) => {
      const current = store.getSnapshot();
      if (current.some((e) => e.cds === cds) || current.length >= MAX_SAVED_SCHOOLS) return;
      store.write([...current, { cds, addedAt: new Date().toISOString() }]);
    },
    [store],
  );

  const remove = useCallback(
    (cds: CdsCode) => store.write(store.getSnapshot().filter((e) => e.cds !== cds)),
    [store],
  );

  const removeMany = useCallback(
    (codes: readonly CdsCode[]) =>
      store.write(store.getSnapshot().filter((e) => !codes.includes(e.cds))),
    [store],
  );

  const toggle = useCallback(
    (cds: CdsCode) => (store.getSnapshot().some((e) => e.cds === cds) ? remove(cds) : add(cds)),
    [add, remove, store],
  );

  return {
    /** Entries with the time each was added, oldest first. */
    saved,
    /** Just the codes, in the same order. */
    list,
    ready,
    has,
    add,
    remove,
    removeMany,
    toggle,
    isFull,
    max: MAX_SAVED_SCHOOLS,
    /** Link to the My schools page showing this list. */
    href: mySchoolsHref(list),
  };
}
