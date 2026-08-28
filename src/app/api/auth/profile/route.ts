import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { profileUpdateSchema } from "@/features/auth/schemas";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/** PATCH — updates the CALLER's own profile only. There is no uid in the URL on purpose: this endpoint can never target another user's document. */
export async function PATCH(req: NextRequest) {
  const caller = await getServerUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection("users").doc(caller.uid).update({
    displayName: parsed.data.displayName,
    locale: parsed.data.locale,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
