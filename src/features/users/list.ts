import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

export interface UserRow { uid: string; displayName: string; email: string | null; role: string; createdAt: string | null }

/** Newest 300 accounts, optionally filtered by a name/email fragment (filtered in memory: the directory is small and this avoids extra indexes). */
export async function listUsers(q = ""): Promise<UserRow[]> {
  const snap = await getAdminDb().collection("users").orderBy("createdAt", "desc").limit(300).get();
  const needle = q.trim().toLowerCase();
  return snap.docs
    .map((d) => {
      const v = d.data();
      const created = v.createdAt?.toDate?.() as Date | undefined;
      return { uid: d.id, displayName: String(v.displayName ?? ""), email: (v.email as string) ?? null, role: String(v.role ?? "USER"), createdAt: created ? created.toISOString() : null };
    })
    .filter((u) => !needle || `${u.displayName} ${u.email ?? ""}`.toLowerCase().includes(needle));
}
