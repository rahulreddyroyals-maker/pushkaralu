import "server-only";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { writeAuditLog } from "@/lib/audit/log";
import { firestoreFamilyStore } from "@/features/family/store";
import { familyDeps } from "@/features/family/deps";
import { deleteGroup, leaveGroup } from "@/features/family/service";
import type { Role } from "@/types/roles";

async function deleteQuery(query: FirebaseFirestore.Query): Promise<void> {
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return;
    const batch = getAdminDb().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export type DeleteResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Permanently deletes the caller's account and personal data (Google Play / GDPR-style requirement).
 * Removed: sign-in account, profile, notification inbox/preferences/devices, favourites, Lost & Found reports,
 * family-group memberships (groups they own are deleted).
 * Kept: bookings and payment records (retained for accounting and provider disputes; they reference only an opaque id afterwards).
 * Staff and provider accounts must be handled by an administrator first so listings are never orphaned.
 */
export async function deleteAccount(uid: string, role: Role | null, displayName: string): Promise<DeleteResult> {
  if (role && role !== "USER") {
    return { ok: false, status: 409, error: "Staff and provider accounts can't be deleted here. Please contact support so your listings can be handled first." };
  }
  const db = getAdminDb();
  const actor = { uid, role, displayName };

  for (const g of await firestoreFamilyStore.listGroupsForUser(uid, 100)) {
    if (g.ownerId === uid) await deleteGroup(familyDeps, actor, g.id);
    else await leaveGroup(familyDeps, actor, g.id);
  }
  await deleteQuery(db.collection("lostFoundReports").where("reporterUid", "==", uid));
  await deleteQuery(db.collection("notificationInbox").doc(uid).collection("items"));
  await deleteQuery(db.collection("favorites").doc(uid).collection("items"));
  await db.collection("notificationInbox").doc(uid).delete().catch(() => undefined);
  await db.collection("notificationPrefs").doc(uid).delete().catch(() => undefined);
  await db.collection("users").doc(uid).delete();
  await getAdminAuth().deleteUser(uid);
  await writeAuditLog({ actorUid: uid, action: "ACCOUNT_DELETED", targetType: "user", targetId: uid });
  return { ok: true };
}
