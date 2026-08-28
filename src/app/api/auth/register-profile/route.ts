import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Called once, right after successful client-side registration (any
 * method — email/password, Google, or phone). Creates the Firestore
 * `users/{uid}` profile AND sets the initial `role: USER` custom claim,
 * server-side, in the same request — so there is never a window where a
 * new user exists in Firebase Auth without a corresponding profile/role.
 *
 * Deliberately does NOT accept a `role` field from the client at all
 * (not even to ignore it) — this endpoint can only ever create USER
 * accounts. Every other role is granted exclusively via
 * /api/admin/users/[uid]/role, which requires an authenticated admin.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken = body?.idToken;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
  const locale = body?.locale === "te" ? "te" : "en";

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const adminAuth = getAdminAuth();
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const db = getAdminDb();
  const userRef = db.collection("users").doc(decoded.uid);
  const existing = await userRef.get();

  if (existing.exists) {
    // Idempotent — a retry or duplicate call must not clobber an already
    // (possibly admin-elevated) profile back down to defaults.
    return NextResponse.json({ ok: true, alreadyExisted: true });
  }

  await adminAuth.setCustomUserClaims(decoded.uid, { role: "USER" });

  await userRef.set({
    uid: decoded.uid,
    displayName: displayName || decoded.name || "Pilgrim",
    email: decoded.email ?? null,
    phoneNumber: decoded.phone_number ?? null,
    role: "USER",
    locale,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, alreadyExisted: false });
}
