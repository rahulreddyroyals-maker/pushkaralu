import { NextRequest, NextResponse } from "next/server";
import { getServerUser, clearSessionCookie } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { rateLimitUser } from "@/lib/apiRateLimit";
import { deleteAccount } from "@/features/account/deleteAccount";

export const dynamic = "force-dynamic";

/** DELETE { confirm: "DELETE" } — permanently deletes the CALLER's own account. No uid in the URL: it can never target someone else. Works with the web session cookie or the mobile Bearer token. */
export async function DELETE(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const limited = await rateLimitUser(user.uid, "delete-account", 5);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") return NextResponse.json({ error: 'Send {"confirm":"DELETE"} to confirm.' }, { status: 400 });

  try {
    const profile = await getAdminDb().collection("users").doc(user.uid).get();
    const name = (profile.data()?.displayName as string | undefined) ?? "A pilgrim";
    const result = await deleteAccount(user.uid, user.role, name);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await clearSessionCookie().catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account] deletion failed", error);
    return NextResponse.json({ error: "Could not delete the account right now. Please try again or contact support." }, { status: 500 });
  }
}
