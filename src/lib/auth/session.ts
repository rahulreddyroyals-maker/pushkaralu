import "server-only";
import { cookies, headers } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import type { Role } from "@/types/roles";
import { SESSION_COOKIE_NAME } from "./constants";

const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export interface ServerUser {
  uid: string;
  email: string | null;
  role: Role | null;
}

/**
 * Exchanges a client-obtained Firebase ID token for a long-lived, httpOnly
 * session cookie. Called from the /api/auth/session Route Handler right
 * after client sign-in. This is what lets Server Components know who's
 * logged in without shipping the ID token to every request.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  const adminAuth = getAdminAuth();
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
}

export async function setSessionCookie(sessionCookie: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * THE actual authentication check for server-rendered pages and Route
 * Handlers. Verifies the session cookie's signature against Firebase —
 * unlike middleware's cookie-presence check (fast UX redirect only), this
 * cannot be spoofed by an attacker setting an arbitrary cookie value.
 *
 * `checkRevoked: true` means a session is invalidated immediately if the
 * user's tokens were revoked server-side (e.g. after a role change that
 * requires forcing re-auth, or a security incident) rather than waiting
 * up to 5 days for the cookie to expire naturally.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  const store = await cookies();
  const sessionCookie = store.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
      return toServerUser(decoded);
    } catch {
      // Invalid, expired, or revoked cookie — fall through to the bearer check, then "not logged in".
    }
  }
  return getBearerUser();
}

function toServerUser(decoded: { uid: string; email?: string; role?: unknown }): ServerUser {
  return { uid: decoded.uid, email: decoded.email ?? null, role: (decoded.role as Role | undefined) ?? null };
}

/**
 * Native-app auth: the mobile app has no cookie jar, so it sends its Firebase
 * ID token as `Authorization: Bearer <token>`. Verified with the Admin SDK
 * (signature, expiry, revocation) exactly like the cookie path — never decoded
 * by hand. Bearer tokens are not sent automatically by browsers, so this adds
 * no CSRF exposure.
 */
async function getBearerUser(): Promise<ServerUser | null> {
  try {
    const header = (await headers()).get("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) return null;
    return toServerUser(await getAdminAuth().verifyIdToken(match[1]!, true));
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME } from "./constants";
