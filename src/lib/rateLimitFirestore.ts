import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { RateStore } from "./rateLimit";

/** Transactional fixed-window counter in `{collection}/{hash(key)}`. Keys are hashed, so no raw ids/IPs are stored. */
export function createFirestoreRateStore(collection: string): RateStore {
  return {
    async hit(key, windowMs, now) {
      const ref = getAdminDb().collection(collection).doc(createHash("sha256").update(key).digest("hex").slice(0, 40));
      return getAdminDb().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.data() as { count: number; windowStart: number } | undefined;
        const next = cur && now - cur.windowStart < windowMs ? { count: cur.count + 1, windowStart: cur.windowStart } : { count: 1, windowStart: now };
        tx.set(ref, { ...next, expiresAt: new Date(next.windowStart + windowMs * 2), updatedAt: FieldValue.serverTimestamp() });
        return next;
      });
    },
  };
}
