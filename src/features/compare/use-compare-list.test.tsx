import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CdsCode } from "@/lib/schemas";
import { useCompareList } from "./use-compare-list";

let query = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

const A = "34674396034292" as CdsCode;
const B = "34674390102038" as CdsCode;
const C = "34674396976575" as CdsCode;
const D = "34674393435419" as CdsCode;
const E = "34674396034326" as CdsCode;
const F = "34674390133777" as CdsCode;

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.history.replaceState(null, "", "/en/compare");
  replaceState = vi.spyOn(window.history, "replaceState");
});
afterEach(() => {
  replaceState.mockRestore();
});

describe("useCompareList", () => {
  it("reads the list from the query and exposes a link query", () => {
    query = `compare=${A},${B}&address=x`;
    const { result } = renderHook(() => useCompareList());
    expect(result.current.list).toEqual([A, B]);
    expect(result.current.has(A)).toBe(true);
    expect(result.current.has(C)).toBe(false);
    expect(result.current.isFull).toBe(false);
    expect(result.current.max).toBe(5);
    expect(result.current.query).toBe(`?compare=${A},${B}&address=x`);
  });

  // URLSearchParams encodes the commas; parseCompareParams decodes them.
  it("writes through replaceState with a null state so Next syncs useSearchParams", () => {
    query = `compare=${A},${B}&address=x`;
    const { result } = renderHook(() => useCompareList());
    act(() => result.current.remove(A));
    expect(replaceState).toHaveBeenLastCalledWith(null, "", `/en/compare?compare=${B}&address=x`);
    act(() => result.current.add(C));
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      `/en/compare?compare=${A}%2C${B}%2C${C}&address=x`,
    );
    act(() => result.current.clear());
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/en/compare?address=x");
  });

  it("toggles and refuses to grow past the maximum", () => {
    query = `compare=${A},${B},${C},${D},${E}`;
    const { result } = renderHook(() => useCompareList());
    expect(result.current.isFull).toBe(true);
    act(() => result.current.add(F));
    expect(replaceState).not.toHaveBeenCalled();
    act(() => result.current.toggle(E));
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      `/en/compare?compare=${A}%2C${B}%2C${C}%2C${D}`,
    );
  });
});
