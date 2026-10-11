import "server-only";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AggRow } from "@/lib/analytics/summarize";
import type { AnalyticsStore, CounterDelta } from "./store";

export const SHARDS = 3;
const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 32);

/**
 * Sharded daily counters. One document per (day, type, entityType, entityId,
 * action, shard); the id is a hash because entity ids/paths can contain "/".
 * Shards spread writes on hot keys (the home page) across documents so the
 * ~1 write/sec/document Firestore limit isn't the ceiling.
 */
export const firestoreAnalyticsStore: AnalyticsStore = {
  async add(deltas: CounterDelta[]) {
    const db = getAdminDb();
    const batch = db.batch();
    const adTotals = new Map<string, { i: number; c: number; shard: number }>();
    for (const d of deltas) {
      const id = `${hash(`${d.day}|${d.type}|${d.entityType}|${d.entityId}|${d.action}`)}_${d.shard}`;
      batch.set(
        db.collection("analyticsCounters").doc(id),
        { day: d.day, type: d.type, entityType: d.entityType, entityId: d.entityId, action: d.action, label: d.label, count: FieldValue.increment(1), uniques: FieldValue.increment(d.first ? 1 : 0), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      if (d.type === "ad_impression" || d.type === "ad_click") {
        const key = `${d.entityId}_${d.shard}`;
        const cur = adTotals.get(key) ?? { i: 0, c: 0, shard: d.shard };
        if (d.type === "ad_impression") cur.i += 1;
        else cur.c += 1;
        adTotals.set(key, cur);
      }
    }
    for (const [key, v] of adTotals) {
      batch.set(db.collection("adTotals").doc(key), { impressions: FieldValue.increment(v.i), clicks: FieldValue.increment(v.c), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  },

  async readRange(fromDay, toDay, cap) {
    const snap = await getAdminDb().collection("analyticsCounters").where("day", ">=", fromDay).where("day", "<=", toDay).limit(cap + 1).get();
    const docs = snap.docs.slice(0, cap);
    const rows: AggRow[] = docs.map((d) => {
      const v = d.data();
      return { day: v.day, type: v.type, entityType: v.entityType, entityId: v.entityId, action: v.action ?? "", label: v.label ?? "", count: Number(v.count) || 0, uniques: Number(v.uniques) || 0 };
    });
    return { rows, truncated: snap.docs.length > cap };
  },

  async adTotals(ids) {
    const db = getAdminDb();
    const refs = ids.flatMap((id) => Array.from({ length: SHARDS }, (_, s) => db.collection("adTotals").doc(`${id}_${s}`)));
    const out: Record<string, { impressions: number; clicks: number }> = Object.fromEntries(ids.map((id) => [id, { impressions: 0, clicks: 0 }]));
    if (refs.length === 0) return out;
    const snaps = await db.getAll(...refs);
    snaps.forEach((s, i) => {
      if (!s.exists) return;
      const id = ids[Math.floor(i / SHARDS)];
      out[id].impressions += Number(s.data()?.impressions) || 0;
      out[id].clicks += Number(s.data()?.clicks) || 0;
    });
    return out;
  },
};
