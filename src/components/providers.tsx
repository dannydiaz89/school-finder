"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client-side providers. Theme only for now. Keep this list short: anything
 * that can be a server component should not be in here.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="school-finder-theme"
    >
      {children}
    </ThemeProvider>
  );
}
