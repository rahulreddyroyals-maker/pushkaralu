import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { canAssignRole } from "@/lib/auth/guards";
import { assignRoleSchema } from "@/features/auth/schemas";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import { FieldValue } from "firebase-admin/firestore";

/**
 * The ONLY path by which a user's role can ever change. Enforces, in
 * order: (1) caller is authenticated via a real server-verified session
 * — not a client-supplied header or cookie value; (2) request body is a
 * known role from a fixed enum, via Zod — arbitrary strings are rejected
 * before they reach any authorization logic; (3) caller's role is
 * actually permitted to grant the requested role (see
 * src/lib/auth/guards.ts canAssignRole — blocks ADMIN from minting more
 * ADMINs); (4) every successful change is written to the append-only
 * audit log before returning success.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid: targetUid } = await params;

  // 1. Authenticate the caller via the real session — never trust a
  // client-supplied role/uid header.
  const caller = await getServerUser();
  if (!caller) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Validate the request body shape before touching authorization logic.
  const body = await req.json().catch(() => null);
  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { role: newRole, reason } = parsed.data;

  // 3. Authorize: can THIS caller grant THIS specific role?
  if (!canAssignRole(caller.role, newRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  const targetSnapshot = await db.collection("users").doc(targetUid).get();
  if (!targetSnapshot.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const previousRole = targetSnapshot.data()?.role ?? null;

  // 4. Apply the change: custom claim (source of truth) + Firestore
  // denormalized copy, then audit log — in that order, so the audit log
  // only records changes that actually succeeded.
  await adminAuth.setCustomUserClaims(targetUid, { role: newRole });
  await db.collection("users").doc(targetUid).update({
    role: newRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actorUid: caller.uid,
    action: "ROLE_ASSIGNED",
    targetType: "user",
    targetId: targetUid,
    metadata: { previousRole, newRole, reason },
  });

  return NextResponse.json({ ok: true, previousRole, newRole });
}
