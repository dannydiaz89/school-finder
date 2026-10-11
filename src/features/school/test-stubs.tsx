import type { ComponentProps } from "react";
import { vi } from "vitest";
import type { Link as NavLink } from "@/i18n/navigation";
import type { CdsCode } from "@/lib/schemas";

/*
 * Stand-ins for the two hooks the detail page needs a Next router for.
 * Tests load them with `vi.mock("@/i18n/navigation", () => import("./test-stubs"))`
 * and the same for "@/features/compare/use-compare-list".
 */

type Href = ComponentProps<typeof NavLink>["href"];

/** Render an `href` the way next-intl would under /en: strings as-is, objects as path plus query. */
export function hrefToString(href: Href): string {
  if (typeof href === "string") return `/en${href}`;
  const { pathname, query } = href as { pathname: string; query?: Record<string, string> };
  const search = query ? new URLSearchParams(query).toString() : "";
  return `/en${pathname}${search ? `?${search}` : ""}`;
}

export function Link({ href, ...rest }: ComponentProps<"a"> & { href: Href }) {
  return <a href={hrefToString(href)} {...rest} />;
}

export const compareState = {
  list: [] as CdsCode[],
  toggle: vi.fn<(cds: CdsCode) => void>(),
  isFull: false,
};

export function useCompareList() {
  return {
    list: compareState.list,
    has: (cds: CdsCode) => compareState.list.includes(cds),
    toggle: compareState.toggle,
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    isFull: compareState.isFull,
    max: 5,
    query: compareState.list.length ? `?compare=${compareState.list.join(",")}` : "",
  };
}
