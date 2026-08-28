import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

/** POST { idToken } — called right after client-side Firebase sign-in to establish a server session. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken = body?.idToken;

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const sessionCookie = await createSessionCookie(idToken);
    await setSessionCookie(sessionCookie);
    return NextResponse.json({ ok: true });
  } catch {
    // Covers expired/invalid ID tokens — never leak Firebase's internal error detail (spec §39).
    return NextResponse.json({ error: "Could not establish session" }, { status: 401 });
  }
}

/** DELETE — clears the session cookie. Called from signOutUser() alongside client-side signOut(). */
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
