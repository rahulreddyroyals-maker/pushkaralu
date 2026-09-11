import { canAssignRole } from "./guards";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import { FieldValue } from "firebase-admin/firestore";
import type { Role } from "@/types/roles";

export type AssignRoleResult =
  | { ok: true; previousRole: Role | null; newRole: Role }
  | { ok: false; status: 403 | 404; error: string };

/**
 * The single mutation path for changing a user's role — custom claim
 * (source of truth) + Firestore denormalized copy + audit log, in that
 * order. Used directly by /api/admin/users/[uid]/role AND by every
 * provider-approval route (hotels/purohits/businesses) so there is
 * exactly one place this logic lives, not a copy per call site that
 * could quietly drift out of sync on the privilege-escalation check.
 */
export async function assignRole({
  actorUid,
  actorRole,
  targetUid,
  newRole,
  reason,
}: {
  actorUid: string;
  actorRole: Role | null;
  targetUid: string;
  newRole: Role;
  reason: string;
}): Promise<AssignRoleResult> {
  if (!canAssignRole(actorRole, newRole)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  const targetSnapshot = await db.collection("users").doc(targetUid).get();
  if (!targetSnapshot.exists) {
    return { ok: false, status: 404, error: "User not found" };
  }
  const previousRole = (targetSnapshot.data()?.role as Role | undefined) ?? null;

  await adminAuth.setCustomUserClaims(targetUid, { role: newRole });
  await db.collection("users").doc(targetUid).update({
    role: newRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actorUid,
    action: "ROLE_ASSIGNED",
    targetType: "user",
    targetId: targetUid,
    metadata: { previousRole, newRole, reason },
  });

  return { ok: true, previousRole, newRole };
}
