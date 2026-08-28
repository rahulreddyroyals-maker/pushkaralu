import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Append-only audit log — see docs/DATABASE_SCHEMA.md `auditLogs`
 * collection. Firestore rules (firestore.rules) deny update/delete on
 * this collection entirely; this function only ever creates new docs.
 *
 * Called from every administrative Route Handler that changes something
 * sensitive (role assignment, provider approval, event edits, etc.) — see
 * src/app/api/admin/users/[uid]/role/route.ts for the first real use.
 */
export interface AuditLogEntry {
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  const db = getAdminDb();
  await db.collection("auditLogs").add({
    ...entry,
    metadata: entry.metadata ?? {},
    timestamp: FieldValue.serverTimestamp(),
  });
}
