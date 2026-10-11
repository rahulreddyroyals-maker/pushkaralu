import { LOCATION_ENTITY_TYPES, SERVICE_ENTITY_TYPES } from "./events";

/** One stored counter row: a day x thing combination, summed over shards. */
export interface AggRow {
  day: string;
  type: string;
  entityType: string;
  entityId: string;
  action: string;
  label: string;
  count: number;
  uniques: number;
}

export interface TopItem { entityType: string; entityId: string; label: string; count: number; uniques: number }
export interface Series { day: string; value: number }

const sum = (rows: AggRow[], pick: (r: AggRow) => number = (r) => r.count) => rows.reduce((n, r) => n + pick(r), 0);
const only = (rows: AggRow[], f: (r: AggRow) => boolean) => rows.filter(f);

/** Merge rows that differ only by shard/day into one row per (type, entityType, entityId, action). */
export function mergeRows(rows: AggRow[]): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const r of rows) {
    const k = `${r.type}|${r.entityType}|${r.entityId}|${r.action}`;
    const cur = map.get(k);
    if (cur) {
      cur.count += r.count;
      cur.uniques += r.uniques;
      if (r.label) cur.label = r.label;
    } else map.set(k, { ...r, day: "" });
  }
  return [...map.values()];
}

export function dailySeries(rows: AggRow[], days: string[], f: (r: AggRow) => boolean): Series[] {
  const byDay = new Map<string, number>();
  for (const r of rows) if (f(r)) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.count);
  return days.map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

export function top(rows: AggRow[], f: (r: AggRow) => boolean, n = 10): TopItem[] {
  return mergeRows(rows.filter(f))
    .sort((a, b) => b.count - a.count || a.entityId.localeCompare(b.entityId))
    .slice(0, n)
    .map((r) => ({ entityType: r.entityType, entityId: r.entityId, label: r.label, count: r.count, uniques: r.uniques }));
}

export interface PlatformMetrics {
  pageViews: number;
  uniquePageViews: number;
  searches: number;
  appOpens: number;
  providerViews: number;
  hotelViews: number;
  hotelClicks: number;
  purohitViews: number;
  shares: number;
  inquiryStarts: number;
  adImpressions: number;
  adClicks: number;
}

export function platformMetrics(rows: AggRow[]): PlatformMetrics {
  const t = (type: string, f: (r: AggRow) => boolean = () => true) => only(rows, (r) => r.type === type && f(r));
  return {
    pageViews: sum(t("page_view")),
    uniquePageViews: sum(t("page_view"), (r) => r.uniques),
    searches: sum(t("search")),
    appOpens: sum(t("app_open")),
    providerViews: sum(t("entity_view", (r) => (SERVICE_ENTITY_TYPES as string[]).includes(r.entityType))),
    hotelViews: sum(t("entity_view", (r) => r.entityType === "hotel")),
    hotelClicks: sum(t("click", (r) => r.entityType === "hotel")),
    purohitViews: sum(t("entity_view", (r) => r.entityType === "purohit")),
    shares: sum(t("share")),
    inquiryStarts: sum(t("inquiry_start")),
    adImpressions: sum(t("ad_impression")),
    adClicks: sum(t("ad_click")),
  };
}

export const popularLocations = (rows: AggRow[], n = 10) => top(rows, (r) => r.type === "entity_view" && (LOCATION_ENTITY_TYPES as string[]).includes(r.entityType), n);
export const popularServices = (rows: AggRow[], n = 10) => top(rows, (r) => r.type === "entity_view" && (SERVICE_ENTITY_TYPES as string[]).includes(r.entityType), n);
export const topSearches = (rows: AggRow[], n = 10) => top(rows, (r) => r.type === "search", n);
export const topPages = (rows: AggRow[], n = 10) => top(rows, (r) => r.type === "page_view", n);
export const sharesByChannel = (rows: AggRow[]) => {
  const out: Record<string, number> = {};
  for (const r of rows) if (r.type === "share") out[r.action] = (out[r.action] ?? 0) + r.count;
  return out;
};

export interface EntityStats {
  views: number;
  uniqueViews: number;
  clicks: Record<string, number>;
  totalClicks: number;
  inquiryStarts: number;
  series: Series[];
}

/** Stats for one listing (hotel/purohit/business). */
export function entityStats(rows: AggRow[], entityType: string, entityId: string, days: string[]): EntityStats {
  const mine = rows.filter((r) => r.entityType === entityType && r.entityId === entityId);
  const clicks: Record<string, number> = {};
  for (const r of mine) if (r.type === "click") clicks[r.action] = (clicks[r.action] ?? 0) + r.count;
  return {
    views: sum(mine.filter((r) => r.type === "entity_view")),
    uniqueViews: sum(mine.filter((r) => r.type === "entity_view"), (r) => r.uniques),
    clicks,
    totalClicks: Object.values(clicks).reduce((a, b) => a + b, 0),
    inquiryStarts: sum(mine.filter((r) => r.type === "inquiry_start")),
    series: dailySeries(mine, days, (r) => r.type === "entity_view"),
  };
}

export const ratio = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 10_000) / 100 : null);
