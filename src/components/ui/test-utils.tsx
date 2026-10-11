import { NextIntlClientProvider } from "next-intl";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import en from "../../../messages/en.json";

/*
 * jsdom lacks a few browser APIs that Radix primitives touch. Stub them
 * once so component tests can open popovers and dialogs.
 */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
}

export function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en} timeZone="America/Los_Angeles">
      {children}
    </NextIntlClientProvider>
  );
}

/** `render` with the English messages loaded, for components that translate. */
export function renderWithIntl(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: IntlWrapper, ...options });
}
