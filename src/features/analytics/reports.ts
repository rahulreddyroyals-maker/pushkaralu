import { dayKey, rangeBounds, rangeKeys, type RangeDays } from "@/lib/analytics/days";
import {
  dailySeries, entityStats, platformMetrics, popularLocations, popularServices, ratio, sharesByChannel, topPages, topSearches,
  type EntityStats, type PlatformMetrics, type Series, type TopItem,
} from "@/lib/analytics/summarize";
import { effectiveStatus, estimatedSpend, type AdvertiserRec, type CampaignRec, type EffectiveStatus, type Totals } from "@/features/ads/select";
import type { AnalyticsStore } from "./store";

/** Booking facts reports need — no customer identity or contact details. */
export interface BookingFact { providerId: string; providerType: string; status: string; amount: number; commissionAmount: number; providerPayout: number; createdAt: string }
export interface LeadFact { providerId: string; createdAt: string }
export interface OwnedListing { type: "hotel" | "purohit" | "business"; id: string; name: string }
export interface CampaignReportRec extends CampaignRec { title: string }
export interface AdvertiserReportRec extends AdvertiserRec { name: string; ownerUid?: string }

/** Data port for reports. Production adapter: reportsData.ts. */
export interface ReportData {
  bookingsInRange(from: Date, to: Date, cap: number): Promise<BookingFact[]>;
  ownedListings(uid: string): Promise<OwnedListing[]>;
  /** Bookings whose provider owner is `uid` (the booking's denormalised providerOwnerId). */
  bookingsForOwner(uid: string, cap: number): Promise<BookingFact[]>;
  leadsForListings(listingIds: string[], cap: number): Promise<LeadFact[]>;
  allCampaigns(cap: number): Promise<CampaignReportRec[]>;
  advertisers(ids?: string[]): Promise<AdvertiserReportRec[]>;
  advertisersForOwner(uid: string): Promise<AdvertiserReportRec[]>;
  campaignsForAdvertisers(ids: string[]): Promise<CampaignReportRec[]>;
}
export interface ReportDeps { store: AnalyticsStore; data: ReportData; now: () => Date }

const READ_CAP = 20_000;
const REALIZED = new Set(["CONFIRMED", "COMPLETED"]);
const round2 = (n: number) => Math.round(n * 100) / 100;
const inRange = (iso: string, from: Date, to: Date) => { const t = Date.parse(iso); return t >= from.getTime() && t < to.getTime(); };

export interface CampaignPerf {
  id: string; title: string; advertiser: string; placement: string; format: string; status: EffectiveStatus;
  startDate: string; endDate: string; budgetInr: number; pricingModel: string;
  impressions: number; clicks: number; ctrPercent: number | null; estimatedSpendInr: number | null;
}

async function campaignPerf(deps: ReportDeps, campaigns: CampaignReportRec[], advertisers: AdvertiserReportRec[]): Promise<CampaignPerf[]> {
  const totals = await deps.store.adTotals(campaigns.map((c) => c.id));
  const advMap = new Map(advertisers.map((a) => [a.id, a]));
  const now = deps.now();
  return campaigns.map((c) => {
    const t: Totals = totals[c.id] ?? { impressions: 0, clicks: 0 };
    return {
      id: c.id, title: c.title, advertiser: advMap.get(c.advertiserId)?.name ?? "—", placement: c.placement, format: c.format,
      status: effectiveStatus(c, advMap.get(c.advertiserId), t, now), startDate: c.startDate, endDate: c.endDate, budgetInr: c.budgetInr,
      pricingModel: c.pricingModel, impressions: t.impressions, clicks: t.clicks, ctrPercent: ratio(t.clicks, t.impressions), estimatedSpendInr: estimatedSpend(c, t),
    };
  });
}

export interface AdminReport {
  range: RangeDays; days: string[]; truncated: boolean;
  metrics: PlatformMetrics; pageViewSeries: Series[];
  popularLocations: TopItem[]; popularServices: TopItem[]; topSearches: TopItem[]; topPages: TopItem[]; shares: Record<string, number>;
  bookings: { count: number; realized: number; revenueInr: number; commissionInr: number; series: Series[] };
  campaigns: CampaignPerf[];
}

/** Platform-wide report. The caller MUST have verified an admin role — this function does not authorise. */
export async function adminReport(deps: ReportDeps, range: RangeDays): Promise<AdminReport> {
  const days = rangeKeys(range, deps.now());
  const { from, to } = rangeBounds(days);
  const [{ rows, truncated }, bookings, campaigns, advertisers] = await Promise.all([
    deps.store.readRange(days[0], days[days.length - 1], READ_CAP),
    deps.data.bookingsInRange(from, to, 5_000),
    deps.data.allCampaigns(500),
    deps.data.advertisers(),
  ]);
  const realized = bookings.filter((b) => REALIZED.has(b.status));
  const byDay = new Map<string, number>();
  for (const b of bookings) { const k = dayKey(new Date(b.createdAt)); byDay.set(k, (byDay.get(k) ?? 0) + 1); }
  return {
    range, days, truncated,
    metrics: platformMetrics(rows),
    pageViewSeries: dailySeries(rows, days, (r) => r.type === "page_view"),
    popularLocations: popularLocations(rows), popularServices: popularServices(rows), topSearches: topSearches(rows), topPages: topPages(rows), shares: sharesByChannel(rows),
    bookings: {
      count: bookings.length, realized: realized.length,
      revenueInr: round2(realized.reduce((n, b) => n + b.amount, 0)), commissionInr: round2(realized.reduce((n, b) => n + b.commissionAmount, 0)),
      series: days.map((day) => ({ day, value: byDay.get(day) ?? 0 })),
    },
    campaigns: await campaignPerf(deps, campaigns, advertisers),
  };
}

export interface ListingReport extends OwnedListing {
  stats: EntityStats; leads: number; bookings: number; revenueInr: number;
  /** Funnel conversion percentages (null when the denominator is 0). */
  rates: { clickRate: number | null; leadRate: number | null; bookingRate: number | null };
}
export interface ProviderReport {
  range: RangeDays; days: string[]; truncated: boolean;
  totals: { views: number; clicks: number; inquiryStarts: number; leads: number; bookings: number; revenueInr: number };
  listings: ListingReport[]; campaigns: CampaignPerf[];
}

/**
 * A business owner's report. `ownerUid` MUST come from the authenticated session, never from request input;
 * everything returned is scoped to listings/campaigns that uid owns, and contains counts only (no visitor details).
 */
export async function providerReport(deps: ReportDeps, ownerUid: string, range: RangeDays): Promise<ProviderReport> {
  const days = rangeKeys(range, deps.now());
  const { from, to } = rangeBounds(days);
  const [listings, ownerBookings, advertisers] = await Promise.all([deps.data.ownedListings(ownerUid), deps.data.bookingsForOwner(ownerUid, 5_000), deps.data.advertisersForOwner(ownerUid)]);
  const mine = new Set(listings.map((l) => l.id));
  const [{ rows, truncated }, leads, campaigns] = await Promise.all([
    listings.length ? deps.store.readRange(days[0], days[days.length - 1], READ_CAP) : Promise.resolve({ rows: [], truncated: false }),
    listings.length ? deps.data.leadsForListings([...mine], 5_000) : Promise.resolve([] as LeadFact[]),
    advertisers.length ? deps.data.campaignsForAdvertisers(advertisers.map((a) => a.id)) : Promise.resolve([] as CampaignReportRec[]),
  ]);
  const reports: ListingReport[] = listings.map((l) => {
    const stats = entityStats(rows, l.type, l.id, days);
    const nLeads = leads.filter((x) => x.providerId === l.id && inRange(x.createdAt, from, to)).length;
    const bk = ownerBookings.filter((b) => b.providerId === l.id && inRange(b.createdAt, from, to));
    const realized = bk.filter((b) => REALIZED.has(b.status));
    return {
      ...l, stats, leads: nLeads, bookings: bk.length, revenueInr: round2(realized.reduce((n, b) => n + b.amount, 0)),
      rates: { clickRate: ratio(stats.totalClicks, stats.views), leadRate: ratio(nLeads, stats.views), bookingRate: ratio(bk.length, stats.views) },
    };
  });
  const sum = (f: (r: ListingReport) => number) => reports.reduce((n, r) => n + f(r), 0);
  return {
    range, days, truncated,
    totals: { views: sum((r) => r.stats.views), clicks: sum((r) => r.stats.totalClicks), inquiryStarts: sum((r) => r.stats.inquiryStarts), leads: sum((r) => r.leads), bookings: sum((r) => r.bookings), revenueInr: round2(sum((r) => r.revenueInr)) },
    listings: reports,
    campaigns: await campaignPerf(deps, campaigns, advertisers),
  };
}
