import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware versions of Next's navigation helpers. Always import Link,
 * redirect, usePathname, and useRouter from here, never from "next/link" or
 * "next/navigation", so the current locale is kept in every URL.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
