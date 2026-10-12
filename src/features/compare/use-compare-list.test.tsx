import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CdsCode } from "@/lib/schemas";
import {
  COMPARE_STORAGE_KEY,
  getCompareSnapshot,
  resetCompareStoreForTests,
  writeCompareList,
} from "./store";
import { useCompareList } from "./use-compare-list";

let query = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

const code = (n: number) => `3467439603445${n}` as CdsCode;
const [A, B, C] = [code(1), code(2), code(3)];

beforeEach(() => {
  query = "";
  resetCompareStoreForTests();
});

describe("useCompareList", () => {
  it("starts empty and reads what the browser has stored", () => {
    expect(renderHook(() => useCompareList()).result.current.list).toEqual([]);
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify([A, B]));
    const { result } = renderHook(() => useCompareList());
    expect(result.current.list).toEqual([A, B]);
    expect(result.current.has(A)).toBe(true);
    expect(result.current.has(C)).toBe(false);
    expect(result.current.max).toBe(5);
  });

  it("adds, removes, toggles, and clears, and every user of the hook sees it", () => {
    const first = renderHook(() => useCompareList());
    const second = renderHook(() => useCompareList());
    act(() => first.result.current.add(A));
    act(() => first.result.current.toggle(B));
    expect(second.result.current.list).toEqual([A, B]);
    act(() => second.result.current.remove(A));
    expect(first.result.current.list).toEqual([B]);
    act(() => first.result.current.toggle(B));
    expect(first.result.current.list).toEqual([]);
    act(() => first.result.current.set([C, A]));
    act(() => first.result.current.clear());
    expect(second.result.current.list).toEqual([]);
  });

  it("keeps the list when the address changes to a different search", () => {
    // The reported bug: compare a Whittier school, search Downey, and the list was gone.
    query = "address=Whittier%2C+CA&loc=city&lat=33.97&lng=-118.03";
    const { result, rerender } = renderHook(() => useCompareList());
    act(() => result.current.add(A));
    query = "address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13";
    rerender();
    expect(result.current.list).toEqual([A]);
    act(() => result.current.add(B));
    query = "";
    rerender();
    expect(result.current.list).toEqual([A, B]);
    // And it is still there for a component that mounts later, as after a full page load.
    expect(renderHook(() => useCompareList()).result.current.list).toEqual([A, B]);
  });

  it("ignores a compare list in the address everywhere but the compare page", () => {
    writeCompareList([A, B]);
    query = `compare=${C}`;
    expect(renderHook(() => useCompareList()).result.current.list).toEqual([A, B]);
  });

  it("does not let two quick clicks undo each other", () => {
    const { result } = renderHook(() => useCompareList());
    // Both calls happen before React re-renders, so both see the same stale `list`.
    act(() => {
      result.current.add(A);
      result.current.add(B);
    });
    expect(result.current.list).toEqual([A, B]);
  });

  it("refuses to grow past the maximum and drops duplicates and bad codes", () => {
    const { result } = renderHook(() => useCompareList());
    act(() => {
      for (let n = 0; n < 7; n += 1) result.current.add(code(n));
    });
    expect(result.current.list).toHaveLength(5);
    expect(result.current.isFull).toBe(true);
    act(() => writeCompareList([A, A, "not-a-code", B]));
    expect(getCompareSnapshot()).toEqual([]);
    act(() => writeCompareList([A, A, B]));
    expect(getCompareSnapshot()).toEqual([A, B]);
  });

  it("survives unreadable storage", () => {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, "{not json");
    expect(renderHook(() => useCompareList()).result.current.list).toEqual([]);
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify({ a: 1 }));
    resetCompareStoreForTests();
    expect(getCompareSnapshot()).toEqual([]);
  });

  it("builds a link query with the list and the search location", () => {
    writeCompareList([A, B]);
    query = "address=1420+J+St&lat=38.58&lng=-121.49&radius=5&sort=ela";
    const { result } = renderHook(() => useCompareList());
    expect(result.current.query).toBe(
      `?compare=${A},${B}&address=1420%20J%20St&lat=38.58&lng=-121.49&radius=5`,
    );
  });
});
