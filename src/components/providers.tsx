"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client-side providers. Theme only for now. Keep this list short: anything
 * that can be a server component should not be in here.
 */
/**
 * next-themes renders a small inline script that sets the theme before first
 * paint. It only has to run in the server-rendered page. When this provider
 * mounts again in the browser (switching language remounts the layout), React
 * would render that script too, cannot run it, and logs an error. Marking it
 * as a data block there tells React it is not meant to execute; the provider
 * applies the theme itself once mounted.
 */
const THEME_SCRIPT_PROPS = typeof window === "undefined" ? undefined : { type: "application/json" };

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="school-finder-theme"
      scriptProps={THEME_SCRIPT_PROPS}
    >
      {children}
    </ThemeProvider>
  );
}
