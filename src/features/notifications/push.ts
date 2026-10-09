import "server-only";
import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";
import type { PushSender } from "./service";
import type { PushPayload, PushResult } from "./types";

/** Error codes meaning the token will never work again — delete it. Anything else (quota, network) is transient and keeps the token. */
const DEAD = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);

/** Firebase Cloud Messaging adapter. FCM reports whether it ACCEPTED a message, not whether the device received it. */
export const fcmPushSender: PushSender = {
  async send(payload: PushPayload, tokens: string[]): Promise<PushResult[]> {
    const messaging = getMessaging(getFirebaseAdminApp());
    const high = payload.priority === "HIGH" || payload.priority === "URGENT";
    const out: PushResult[] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const part = tokens.slice(i, i + 500);
      const res = await messaging.sendEachForMulticast({
        tokens: part,
        notification: { title: payload.title, body: payload.body },
        data: { link: payload.link, category: payload.category, priority: payload.priority },
        webpush: { headers: { Urgency: high ? "high" : "normal", TTL: String(high ? 3600 : 86400) }, fcmOptions: { link: payload.link } },
        android: { priority: high ? "high" : "normal" },
        apns: { headers: { "apns-priority": high ? "10" : "5" } },
      });
      res.responses.forEach((r, j) => out.push({ token: part[j], ok: r.success, invalid: !r.success && DEAD.has(r.error?.code ?? "") }));
    }
    return out;
  },
};
