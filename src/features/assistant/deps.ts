import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { createFirestoreRateStore } from "@/lib/rateLimitFirestore";
import { readAiConfig } from "@/lib/ai/config";
import { createProvider } from "@/lib/ai/providers";
import { firestoreAssistantData } from "./dataAdapter";
import { memoizeData } from "./memo";
import type { AssistantDeps } from "./service";
import type { RateStore } from "./rateLimit";

export const firestoreRateStore: RateStore = createFirestoreRateStore("aiRateLimits");

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
