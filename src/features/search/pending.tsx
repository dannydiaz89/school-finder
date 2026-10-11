"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";

/**
 * Shared "the results are updating" state for the search page. Filter and
 * paging changes run inside one transition, so the current results stay on
 * screen, dimmed and marked busy, until the new ones are ready. That gives
 * immediate feedback without a skeleton flash.
 */

interface SearchPending {
  isPending: boolean;
  start: (navigate: () => void) => void;
}

const Context = createContext<SearchPending | null>(null);

export function SearchPendingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const start = useCallback(
    (navigate: () => void) => startTransition(() => navigate()),
    [startTransition],
  );
  const value = useMemo(() => ({ isPending, start }), [isPending, start]);
  return <Context value={value}>{children}</Context>;
}

/** Run a navigation as a tracked transition. Outside a provider it simply runs. */
export function useStartNavigation(): (navigate: () => void) => void {
  const context = useContext(Context);
  return context?.start ?? ((navigate) => navigate());
}

/** Wraps the results; dims and announces "busy" while a navigation is in flight. */
export function PendingRegion({ children }: { children: ReactNode }) {
  const isPending = useContext(Context)?.isPending ?? false;
  return (
    <div
      aria-busy={isPending}
      className={
        isPending ? "opacity-60 transition-opacity duration-150" : "transition-opacity duration-150"
      }
    >
      {children}
    </div>
  );
}
