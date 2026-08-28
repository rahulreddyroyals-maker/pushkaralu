import "server-only";
import { cookies } from "next/headers";
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
  if (!sessionCookie) return null;

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = (decoded.role as Role | undefined) ?? null;
    return { uid: decoded.uid, email: decoded.email ?? null, role };
  } catch {
    // Invalid, expired, or revoked cookie — treat identically to "not logged in".
    return null;
  }
}

export { SESSION_COOKIE_NAME } from "./constants";
