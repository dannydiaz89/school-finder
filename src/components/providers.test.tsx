import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

beforeEach(() => {
  // jsdom has no matchMedia; next-themes asks it for the system theme.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("Providers", () => {
  it("mounts in the browser without React's script-tag error", () => {
    // Regression: switching language remounts the layout in the browser. The theme
    // library's inline script was rendered there as an executable script, which React
    // cannot run and reports as an error.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <Providers>
        <p>content</p>
      </Providers>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    const scriptErrors = error.mock.calls.filter((call) => /script tag/i.test(String(call[0])));
    expect(scriptErrors).toEqual([]);
    // Rendered in the browser, the script is a data block, never an executable one.
    expect(container.querySelector("script")?.getAttribute("type")).toBe("application/json");
    error.mockRestore();
  });
});
