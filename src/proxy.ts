import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * IMPORTANT — this is a UX convenience, not a security boundary.
 *
 * This runs as a Next.js "proxy" (formerly "middleware") on the Edge
 * runtime, which cannot safely use the Firebase Admin SDK (Node-only
 * APIs, and we don't want a service-account credential loaded into every
 * edge request). So this only checks whether the session cookie is
 * PRESENT, not whether it's valid — a forged cookie value would pass this
 * check.
 *
 * The actual authorization happens in:
 *   - Server Components / Route Handlers via getServerUser() (verifies
 *     the cookie's signature against Firebase — see src/lib/auth/session.ts)
 *   - Firestore Security Rules (firestore.rules) for any direct client
 *     reads/writes
 *
 * This proxy exists purely so an obviously-logged-out visitor gets
 * redirected to /login immediately, instead of waiting for a server
 * round-trip that will redirect them anyway.
 */
const PROTECTED_PREFIXES = ["/admin", "/profile", "/family", "/lost-and-found/report", "/lost-and-found/mine"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/family/:path*", "/lost-and-found/report", "/lost-and-found/mine"],
};
