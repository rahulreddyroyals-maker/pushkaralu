import { dayKey } from "@/lib/analytics/days";
import type { AdFormat, PlacementKey } from "./placements";
import { PLACEMENTS, formatAllowedIn } from "./placements";

/** The fields of a campaign record the ad server needs. Admin-entered, trusted. */
export interface CampaignRec {
  id: string;
  published: boolean;
  advertiserId: string;
  format: AdFormat;
  placement: PlacementKey;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "CANCELLED";
  startDate: string;
  endDate: string;
  budgetInr: number;
  pricingModel: "FLAT" | "CPC" | "CPM";
  rateInr?: number;
  weight: number;
}
export interface AdvertiserRec { id: string; published: boolean; status: "ACTIVE" | "SUSPENDED" }
export interface Totals { impressions: number; clicks: number }

export type EffectiveStatus = "DRAFT" | "PENDING_APPROVAL" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "EXHAUSTED" | "CANCELLED" | "ADVERTISER_INACTIVE";

/** Estimated spend. FLAT campaigns are a fixed fee, so there is no per-event spend to estimate (null). */
export function estimatedSpend(c: Pick<CampaignRec, "pricingModel" | "rateInr" | "budgetInr">, t: Totals): number | null {
  if (c.pricingModel === "FLAT") return null;
  const rate = c.rateInr ?? 0;
  const raw = c.pricingModel === "CPC" ? t.clicks * rate : (t.impressions / 1000) * rate;
  return Math.min(c.budgetInr, Math.round(raw * 100) / 100);
}

export const isExhausted = (c: CampaignRec, t: Totals): boolean => {
  const s = estimatedSpend(c, t);
  return s !== null && c.budgetInr > 0 && s >= c.budgetInr;
};

/** What a campaign is actually doing right now — one definition shared by the ad server and the admin report. */
export function effectiveStatus(c: CampaignRec, advertiser: AdvertiserRec | undefined, totals: Totals, now: Date): EffectiveStatus {
  if (c.status === "CANCELLED") return "CANCELLED";
  if (c.status === "DRAFT") return "DRAFT";
  if (c.status === "PAUSED") return "PAUSED";
  if (!c.published) return "PENDING_APPROVAL";
  if (!advertiser || !advertiser.published || advertiser.status !== "ACTIVE") return "ADVERTISER_INACTIVE";
  const today = dayKey(now);
  if (today < c.startDate) return "SCHEDULED";
  if (today > c.endDate) return "ENDED";
  if (isExhausted(c, totals)) return "EXHAUSTED";
  return "ACTIVE";
}

export interface SelectInput {
  campaigns: CampaignRec[];
  advertisers: Map<string, AdvertiserRec>;
  totals: Record<string, Totals>;
  placement: PlacementKey;
  enabled: boolean;
  maxItems: number;
  now: Date;
  rng: () => number;
}

/**
 * Picks the campaigns to show in a placement: only ones that are truly live
 * (effectiveStatus ACTIVE) with a format the slot supports; at most one per
 * advertiser (no single advertiser fills a slot); weighted random order so
 * equal-weight campaigns rotate fairly. Pure — rng is injected.
 */
export function selectCampaigns(input: SelectInput): CampaignRec[] {
  const { placement, now, rng } = input;
  if (!input.enabled) return [];
  const max = Math.max(0, Math.min(input.maxItems, PLACEMENTS[placement].maxAllowed));
  const live = input.campaigns.filter(
    (c) =>
      c.placement === placement &&
      formatAllowedIn(c.format, placement) &&
      effectiveStatus(c, input.advertisers.get(c.advertiserId), input.totals[c.id] ?? { impressions: 0, clicks: 0 }, now) === "ACTIVE"
  );
  const pool = [...live];
  const picked: CampaignRec[] = [];
  const usedAdvertisers = new Set<string>();
  while (pool.length && picked.length < max) {
    const eligible = pool.filter((c) => !usedAdvertisers.has(c.advertiserId));
    if (eligible.length === 0) break;
    const total = eligible.reduce((n, c) => n + Math.max(1, c.weight), 0);
    let r = rng() * total;
    let choice = eligible[eligible.length - 1];
    for (const c of eligible) {
      r -= Math.max(1, c.weight);
      if (r < 0) { choice = c; break; }
    }
    picked.push(choice);
    usedAdvertisers.add(choice.advertiserId);
    pool.splice(pool.indexOf(choice), 1);
  }
  return picked;
}

/** Where a click on this campaign lands. Resolved from the stored campaign — never from request input. */
export function campaignTarget(c: { format: AdFormat; targetPath?: string; listingType?: string; listingId?: string; articleSlug?: string }): string | null {
  const safe = (v: string | undefined) => (v && ((v.startsWith("/") && !v.startsWith("//")) || /^https:\/\//i.test(v)) ? v : null);
  switch (c.format) {
    case "BANNER":
    case "HOMEPAGE_PROMOTION":
      return safe(c.targetPath);
    case "SPONSORED_LISTING": {
      const base = { hotel: "/hotels", purohit: "/purohits", business: "/businesses" }[c.listingType ?? ""];
      return base && c.listingId ? `${base}/${encodeURIComponent(c.listingId)}` : null;
    }
    case "SPONSORED_ARTICLE":
      return c.articleSlug ? `/articles/${encodeURIComponent(c.articleSlug)}` : null;
  }
}
