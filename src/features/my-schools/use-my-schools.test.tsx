import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SAVED_SCHOOLS, type CdsCode, type SavedSchool } from "@/lib/schemas";
import {
  MY_SCHOOLS_STORAGE_KEY,
  browserSavedSchools,
  resetMySchoolsStoreForTests,
  type SavedSchoolsStore,
} from "./store";
import { mySchoolsHref, useMySchools } from "./use-my-schools";

const code = (n: number) => `34674396${String(n).padStart(6, "0")}` as CdsCode;
const [A, B, C] = [code(1), code(2), code(3)];
const stored = () => JSON.parse(window.localStorage.getItem(MY_SCHOOLS_STORAGE_KEY) ?? "null");

beforeEach(() => resetMySchoolsStoreForTests());

describe("useMySchools", () => {
  it("starts empty and reads what the browser has stored", () => {
    expect(renderHook(() => useMySchools()).result.current.list).toEqual([]);
    window.localStorage.setItem(
      MY_SCHOOLS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        schools: [
          { cds: A, addedAt: "2026-10-12T18:00:00.000Z" },
          { cds: B, addedAt: "2026-10-12T18:05:00.000Z" },
        ],
      }),
    );
    const { result } = renderHook(() => useMySchools());
    expect(result.current.list).toEqual([A, B]);
    expect(result.current.has(A)).toBe(true);
    expect(result.current.has(C)).toBe(false);
    expect(result.current.max).toBe(50);
    expect(result.current.href).toBe(`/my-schools?schools=${A},${B}`);
  });

  it("adds, removes, and toggles, and every user of the hook sees it", () => {
    const first = renderHook(() => useMySchools());
    const second = renderHook(() => useMySchools());
    act(() => first.result.current.add(A));
    act(() => first.result.current.toggle(B));
    expect(second.result.current.list).toEqual([A, B]);
    act(() => second.result.current.toggle(A));
    expect(first.result.current.list).toEqual([B]);
    act(() => first.result.current.removeMany([B, C]));
    expect(second.result.current.list).toEqual([]);
    expect(stored()).toBeNull();
  });

  it("stores a versioned list with the time each school was added", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T19:30:00.000Z"));
    const { result } = renderHook(() => useMySchools());
    act(() => result.current.add(A));
    vi.useRealTimers();
    expect(stored()).toEqual({
      version: 1,
      schools: [{ cds: A, addedAt: "2026-10-12T19:30:00.000Z" }],
    });
  });

  it("does not undo a quick second click", () => {
    const { result } = renderHook(() => useMySchools());
    act(() => {
      result.current.add(A);
      result.current.add(B);
    });
    expect(result.current.list).toEqual([A, B]);
  });

  it("never adds a school twice and stops at the maximum", () => {
    const { result } = renderHook(() => useMySchools());
    act(() => {
      result.current.add(A);
      result.current.add(A);
      for (let i = 10; i < 10 + MAX_SAVED_SCHOOLS + 5; i += 1) result.current.add(code(i));
    });
    expect(result.current.list).toHaveLength(MAX_SAVED_SCHOOLS);
    expect(result.current.isFull).toBe(true);
    expect(result.current.list.filter((c) => c === A)).toHaveLength(1);
  });

  it("ignores stored text that is not a valid list", () => {
    for (const bad of [
      "not json",
      JSON.stringify([A]),
      JSON.stringify({ version: 2, schools: [] }),
    ]) {
      resetMySchoolsStoreForTests();
      window.localStorage.setItem(MY_SCHOOLS_STORAGE_KEY, bad);
      expect(renderHook(() => useMySchools()).result.current.list).toEqual([]);
    }
  });

  it("keeps working in memory when storage refuses a write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useMySchools());
    act(() => result.current.add(A));
    expect(result.current.list).toEqual([A]);
    expect(browserSavedSchools.getSnapshot().map((e) => e.cds)).toEqual([A]);
    setItem.mockRestore();
  });

  it("works against any store, which is how an account would plug in", () => {
    let value: readonly SavedSchool[] = [{ cds: C, addedAt: "2026-01-01T00:00:00.000Z" }];
    const listeners = new Set<() => void>();
    const account: SavedSchoolsStore = {
      getSnapshot: () => value,
      getServerSnapshot: () => value,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      write: (next) => {
        value = next;
        listeners.forEach((l) => l());
      },
    };
    const { result } = renderHook(() => useMySchools(account));
    expect(result.current.list).toEqual([C]);
    act(() => result.current.add(A));
    expect(value.map((e) => e.cds)).toEqual([C, A]);
    // The browser's own list is untouched.
    expect(stored()).toBeNull();
  });
});

describe("mySchoolsHref", () => {
  it("carries the list, or is the plain page when the list is empty", () => {
    expect(mySchoolsHref([])).toBe("/my-schools");
    expect(mySchoolsHref([A, B])).toBe(`/my-schools?schools=${A},${B}`);
  });
});
