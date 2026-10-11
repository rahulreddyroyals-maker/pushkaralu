import type { Lang } from "@/features/assistant/types";
import { checkRate, type RateStore } from "@/lib/rateLimit";
import { dayKey } from "@/lib/analytics/days";
import type { AnalyticsStore } from "@/features/analytics/store";
import { PLACEMENTS, isPlacementKey, type AdFormat, type PlacementKey } from "./placements";
import { campaignTarget, effectiveStatus, selectCampaigns, type AdvertiserRec, type CampaignRec, type Totals } from "./select";

type Loc = { en?: string; te?: string };
const pick = (l: Loc | undefined, lang: Lang) => (l?.[lang] || l?.en || "").trim();

/** Admin-entered creative fields of a campaign (beyond what selection needs). */
export interface CampaignFull extends CampaignRec {
  headline?: Loc;
  body?: Loc;
  ctaLabel?: Loc;
  images?: string[];
  targetPath?: string;
  listingType?: string;
  listingId?: string;
  articleSlug?: string;
}
export interface AdvertiserFull extends AdvertiserRec { name: Loc }
export interface PlacementConfig { enabled: boolean; maxItems: number }
export interface CreativeRef { title: string; subtitle?: string; image?: string }

export interface AdData {
  /** Published campaigns with status ACTIVE for this placement. */
  campaigns(placement: PlacementKey): Promise<CampaignFull[]>;
  advertisers(ids: string[]): Promise<AdvertiserFull[]>;
  placementConfig(placement: PlacementKey): Promise<PlacementConfig | null>;
  /** Approved/published listing, or null — a sponsored listing can never promote something unapproved. */
  listing(type: string, id: string, lang: Lang): Promise<CreativeRef | null>;
  article(slug: string, lang: Lang): Promise<CreativeRef | null>;
  campaignById(id: string): Promise<CampaignFull | null>;
}

export interface ServedAd {
  id: string;
  format: AdFormat;
  placement: PlacementKey;
  sponsor: string;
  headline: string;
  body?: string;
  cta?: string;
  image?: string;
  /** Click-through goes via /r/ad/:id so clicks are counted and the destination comes from the stored campaign. */
  href: string;
  creative?: CreativeRef;
}

export interface ServeDeps {
  data: AdData;
  store: AnalyticsStore;
  now: () => Date;
  rng: () => number;
  rateStore: RateStore;
}

export async function serveAds(deps: ServeDeps, placementRaw: string, lang: Lang): Promise<ServedAd[]> {
  if (!isPlacementKey(placementRaw)) return [];
  const placement = placementRaw;
  const now = deps.now();
  const config = (await deps.data.placementConfig(placement)) ?? { enabled: true, maxItems: PLACEMENTS[placement].defaultMaxItems };
  if (!config.enabled) return [];

  const campaigns = await deps.data.campaigns(placement);
  if (campaigns.length === 0) return [];
  const [advertisers, totals] = await Promise.all([deps.data.advertisers([...new Set(campaigns.map((c) => c.advertiserId))]), deps.store.adTotals(campaigns.map((c) => c.id))]);
  const advById = new Map(advertisers.map((a) => [a.id, a]));

  // Over-select so a campaign whose listing/article turned out unusable can be replaced.
  const chosen = selectCampaigns({ campaigns, advertisers: advById, totals, placement, enabled: true, maxItems: config.maxItems + 2, now, rng: deps.rng });
  const out: ServedAd[] = [];
  for (const c of chosen) {
    if (out.length >= config.maxItems) break;
    const ad = await toServed(deps, c, advById.get(c.advertiserId), placement, lang);
    if (ad) out.push(ad);
  }
  return out;
}

async function toServed(deps: ServeDeps, c: CampaignFull, advertiser: AdvertiserFull | undefined, placement: PlacementKey, lang: Lang): Promise<ServedAd | null> {
  let creative: CreativeRef | undefined;
  if (c.format === "SPONSORED_LISTING") {
    creative = (await deps.data.listing(c.listingType ?? "", c.listingId ?? "", lang)) ?? undefined;
    if (!creative) return null;
  } else if (c.format === "SPONSORED_ARTICLE") {
    creative = (await deps.data.article(c.articleSlug ?? "", lang)) ?? undefined;
    if (!creative) return null;
  }
  if (!campaignTarget(c)) return null;
  return {
    id: c.id, format: c.format, placement, sponsor: pick(advertiser?.name, lang),
    headline: pick(c.headline, lang), body: pick(c.body, lang) || undefined, cta: pick(c.ctaLabel, lang) || undefined,
    image: c.images?.[0], href: `/r/ad/${encodeURIComponent(c.id)}?p=${placement}`, creative,
  };
}

/** One counted click per visitor per campaign per 10 minutes — repeated clicks (or scripts) can't drain a CPC budget. */
export const AD_CLICK_WINDOW_MS = 600_000;

export async function registerClick(deps: ServeDeps, visitorKey: string, campaignId: string, placementRaw: string): Promise<{ target: string | null; counted: boolean }> {
  const c = await deps.data.campaignById(campaignId);
  if (!c) return { target: null, counted: false };
  const target = campaignTarget(c);
  if (!target) return { target: null, counted: false };

  const now = deps.now();
  const advertiser = (await deps.data.advertisers([c.advertiserId]))[0];
  const totals: Totals = (await deps.store.adTotals([c.id]))[c.id] ?? { impressions: 0, clicks: 0 };
  if (effectiveStatus(c, advertiser, totals, now) !== "ACTIVE") return { target, counted: false }; // still send the visitor on; just don't bill it

  const decision = await checkRate(deps.rateStore, `adclick:${visitorKey}:${c.id}`, 1, AD_CLICK_WINDOW_MS, now.getTime());
  if (!decision.allowed) return { target, counted: false };
  const placement = isPlacementKey(placementRaw) ? placementRaw : c.placement;
  await deps.store.add([{ type: "ad_click", entityType: "campaign", entityId: c.id, action: placement, label: "", first: true, day: dayKey(now), shard: Math.floor(deps.rng() * 3) }]);
  return { target, counted: true };
}
