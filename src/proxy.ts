import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Next.js 16 "proxy" (formerly middleware). Adds the locale prefix to
 * incoming requests and redirects bare paths to the user's preferred locale.
 */
export default createIntlMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, Vercel internals, and any file with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
