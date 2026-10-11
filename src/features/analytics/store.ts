import type { AggRow } from "@/lib/analytics/summarize";
import type { CountedEvent } from "@/lib/analytics/events";

/** Counter deltas the ingest service hands to the store. One per resolved event. */
export interface CounterDelta extends CountedEvent {
  day: string;
  shard: number;
}

export interface AdTotals { impressions: number; clicks: number }

/**
 * Storage port. Production = sharded Firestore counters (firestoreStore.ts);
 * tests = memory. Writes are increments only — nothing identifies a visitor.
 */
export interface AnalyticsStore {
  add(deltas: CounterDelta[]): Promise<void>;
  /** All counter rows for days in [fromDay, toDay]. `truncated` is true when the safety cap cut the result. */
  readRange(fromDay: string, toDay: string, cap: number): Promise<{ rows: AggRow[]; truncated: boolean }>;
  /** All-time impressions/clicks per campaign id (used for budget caps and campaign reports). */
  adTotals(campaignIds: string[]): Promise<Record<string, AdTotals>>;
}

export function createMemoryAnalyticsStore(): AnalyticsStore & { rows: Map<string, AggRow>; totals: Map<string, AdTotals> } {
  const rows = new Map<string, AggRow>();
  const totals = new Map<string, AdTotals>();
  return {
    rows,
    totals,
    async add(deltas) {
      for (const d of deltas) {
        const key = `${d.day}|${d.type}|${d.entityType}|${d.entityId}|${d.action}`;
        const cur = rows.get(key) ?? { day: d.day, type: d.type, entityType: d.entityType, entityId: d.entityId, action: d.action, label: d.label, count: 0, uniques: 0 };
        cur.count += 1;
        if (d.first) cur.uniques += 1;
        if (d.label) cur.label = d.label;
        rows.set(key, cur);
        if (d.type === "ad_impression" || d.type === "ad_click") {
          const t = totals.get(d.entityId) ?? { impressions: 0, clicks: 0 };
          if (d.type === "ad_impression") t.impressions += 1;
          else t.clicks += 1;
          totals.set(d.entityId, t);
        }
      }
    },
    async readRange(fromDay, toDay, cap) {
      const all = [...rows.values()].filter((r) => r.day >= fromDay && r.day <= toDay);
      return { rows: all.slice(0, cap), truncated: all.length > cap };
    },
    async adTotals(ids) {
      return Object.fromEntries(ids.map((id) => [id, totals.get(id) ?? { impressions: 0, clicks: 0 }]));
    },
  };
}
