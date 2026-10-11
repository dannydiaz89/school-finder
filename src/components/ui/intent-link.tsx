"use client";

import { useState, type ComponentProps } from "react";
import { TextLink } from "./text-link";

type Props = Omit<ComponentProps<typeof TextLink>, "prefetch">;

/**
 * A TextLink that loads its destination as soon as the visitor shows intent:
 * pointer over it, keyboard focus on it, or a finger touching it. By the time
 * they click, the page content is already in hand, so it appears at once
 * instead of flashing a loading skeleton.
 *
 * Until then it prefetches only the route's shared shell, which is cheap, so
 * a list of 25 results does not load 25 pages. This is the pattern Next.js
 * documents for Partial Prefetching (`prefetch={intent ? true : "auto"}`).
 *
 * Use it for links to data-backed pages (a school, the compare table, search
 * results). Plain navigation links can stay TextLink.
 */
export function IntentLink({ onPointerEnter, onFocus, onTouchStart, ...rest }: Props) {
  const [intent, setIntent] = useState(false);
  return (
    <TextLink
      {...rest}
      prefetch={intent ? true : "auto"}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
