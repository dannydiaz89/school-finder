// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LAST_SEARCH_STORAGE_KEY,
  getLastSearchSnapshot,
  getRecentSearchSnapshot,
  resetLastSearchForTests,
  subscribeToLastSearch,
  writeLastSearch,
} from "./last-search";

beforeEach(() => resetLastSearchForTests());

describe("last search store", () => {
  it("starts empty and remembers what is written", () => {
    expect(getLastSearchSnapshot()).toBe("");
    writeLastSearch("address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13&type=charter");
    expect(getLastSearchSnapshot()).toBe(
      "address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13&type=charter",
    );
    expect(window.sessionStorage.getItem(LAST_SEARCH_STORAGE_KEY)).toBe(getLastSearchSnapshot());
  });

  it("reads a value left by an earlier page in the same tab", () => {
    window.sessionStorage.setItem(LAST_SEARCH_STORAGE_KEY, "address=95816&loc=zip");
    expect(getLastSearchSnapshot()).toBe("address=95816&loc=zip");
  });

  it("forgets the search when a blank one is written", () => {
    writeLastSearch("address=95816");
    writeLastSearch("");
    expect(getLastSearchSnapshot()).toBe("");
    expect(window.sessionStorage.getItem(LAST_SEARCH_STORAGE_KEY)).toBeNull();
  });

  it("drops the legacy compare parameter and anything oversized", () => {
    writeLastSearch("address=95816&compare=34674396034292");
    expect(getLastSearchSnapshot()).toBe("address=95816");
    writeLastSearch(`address=${"x".repeat(3000)}`);
    expect(getLastSearchSnapshot()).toBe("");
  });

  it("notifies subscribers only when the value changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLastSearch(listener);
    writeLastSearch("address=95816");
    writeLastSearch("address=95816");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeLastSearch("address=95817");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps working in memory when storage refuses", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    writeLastSearch("address=95816");
    expect(getLastSearchSnapshot()).toBe("address=95816");
    setItem.mockRestore();
  });

  it("keeps the most recent real search after the search page goes blank", () => {
    // The home screen offers it; returning to a blank search must not erase it.
    writeLastSearch("address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13");
    writeLastSearch("");
    expect(getLastSearchSnapshot()).toBe("");
    expect(getRecentSearchSnapshot()).toBe("address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13");
    // A query with nothing searched (filters only) does not replace it.
    writeLastSearch("radius=5");
    expect(getRecentSearchSnapshot()).toBe("address=Downey%2C+CA&loc=city&lat=33.94&lng=-118.13");
    writeLastSearch("address=95816");
    expect(getRecentSearchSnapshot()).toBe("address=95816");
  });

  it("reads the recent search left by an earlier visit", () => {
    window.localStorage.setItem("school-finder:recent-search:v1", "address=Lincoln+High");
    expect(getRecentSearchSnapshot()).toBe("address=Lincoln+High");
  });
});
