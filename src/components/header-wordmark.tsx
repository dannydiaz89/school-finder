"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { isBlankSearch, parseSearchParams } from "@/lib/schemas";

const SHAPE = "flex flex-col gap-1 whitespace-nowrap text-fg no-underline hover:no-underline";

/** The header wordmark as a link home. Also the fallback while the URL is being read. */
export function WordmarkLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/" className={SHAPE}>
      {children}
    </Link>
  );
}

/**
 * The header wordmark. On the home screen the same name is shown large in
 * the middle of the page, so the small one steps aside there: it keeps its
 * place, so the links beside it do not move, but it is not shown, not
 * announced, and not a link to the page already open.
 *
 * `useSearchParams` is runtime data: render inside a <Suspense> with
 * `WordmarkLink` as the fallback.
 */
export function HeaderWordmark({ children }: { children: ReactNode }) {
  const onHome = usePathname() === "/";
  const blank = isBlankSearch(parseSearchParams(useSearchParams()));
  if (onHome && blank) {
    return (
      // On a phone the header wraps, and an empty first row is wasted space, so it goes entirely.
      <span aria-hidden="true" className={`${SHAPE} invisible max-sm:hidden`}>
        {children}
      </span>
    );
  }
  return <WordmarkLink>{children}</WordmarkLink>;
}
