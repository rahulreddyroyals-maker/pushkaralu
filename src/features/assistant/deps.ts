import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { readAiConfig } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/providers";
import { firestoreAssistantData } from "./dataAdapter";
import { memoizeData } from "./memo";
import type { AssistantDeps } from "./service";
import type { RateStore } from "./rateLimit";

/** Transactional fixed-window counter in `aiRateLimits/{key}`. Keys are uid or a salted hash — no raw IPs stored. */
export const firestoreRateStore: RateStore = {
  async hit(key, windowMs, now) {
    const ref = getAdminDb().collection("aiRateLimits").doc(createHash("sha256").update(key).digest("hex").slice(0, 40));
    return getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const cur = snap.data() as { count: number; windowStart: number } | undefined;
      const next = cur && now - cur.windowStart < windowMs ? { count: cur.count + 1, windowStart: cur.windowStart } : { count: 1, windowStart: now };
      tx.set(ref, { ...next, expiresAt: new Date(next.windowStart + windowMs * 2), updatedAt: FieldValue.serverTimestamp() });
      return next;
    });
  },
};

export function hashVisitor(ip: string): string {
  return createHash("sha256").update(`${process.env.AI_RATE_SALT ?? "pushkaralu"}:${ip}`).digest("hex").slice(0, 32);
}

/** Built per request so the data memo cache never outlives one conversation turn. */
export function assistantDeps(): AssistantDeps {
  return {
    enabled: () => {
      try {
        return readAiConfig().enabled;
      } catch {
        return true; // misconfigured: let the service surface a clean 503 and log the reason
      }
    },
    provider: () => createProvider(),
    data: memoizeData(firestoreAssistantData),
    rateStore: firestoreRateStore,
    now: () => new Date(),
    log: async (entry) => {
      await getAdminDb().collection("aiInteractions").add({ ...entry, createdAt: FieldValue.serverTimestamp() });
    },
  };
}
