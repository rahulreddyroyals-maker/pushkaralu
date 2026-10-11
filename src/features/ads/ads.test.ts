import { describe, it, expect } from "vitest";
import { campaignTarget, effectiveStatus, estimatedSpend, selectCampaigns, type AdvertiserRec, type CampaignRec } from "./select";
import { campaignSchema, placementSchema } from "./definitions";
import { serveAds, registerClick, type AdData, type CampaignFull, type ServeDeps } from "./serve";
import { createMemoryAnalyticsStore } from "@/features/analytics/store";
import { createMemoryRateStore } from "@/lib/rateLimit";

const NOW = new Date("2026-10-10T06:00:00Z");
const camp = (p: Partial<CampaignFull> = {}): CampaignFull => ({
  id: "c1", published: true, advertiserId: "a1", format: "BANNER", placement: "listings_top", status: "ACTIVE", startDate: "2026-10-01", endDate: "2026-10-31",
  budgetInr: 1000, pricingModel: "FLAT", weight: 5, headline: { en: "Stay with us" }, targetPath: "/hotels", images: ["x.jpg"], ...p,
});
const adv: AdvertiserRec = { id: "a1", published: true, status: "ACTIVE" };

describe("effectiveStatus", () => {
  const t = { impressions: 0, clicks: 0 };
  it("serves only approved, active, in-date campaigns of an active advertiser", () => {
    expect(effectiveStatus(camp(), adv, t, NOW)).toBe("ACTIVE");
    expect(effectiveStatus(camp({ published: false }), adv, t, NOW)).toBe("PENDING_APPROVAL");
    expect(effectiveStatus(camp({ status: "PAUSED" }), adv, t, NOW)).toBe("PAUSED");
    expect(effectiveStatus(camp({ startDate: "2026-11-01", endDate: "2026-11-30" }), adv, t, NOW)).toBe("SCHEDULED");
    expect(effectiveStatus(camp({ endDate: "2026-10-09" }), adv, t, NOW)).toBe("ENDED");
    expect(effectiveStatus(camp(), { ...adv, status: "SUSPENDED" }, t, NOW)).toBe("ADVERTISER_INACTIVE");
    expect(effectiveStatus(camp(), { ...adv, published: false }, t, NOW)).toBe("ADVERTISER_INACTIVE");
    expect(effectiveStatus(camp(), undefined, t, NOW)).toBe("ADVERTISER_INACTIVE");
  });
  it("stops CPC campaigns when the budget cap is reached", () => {
    const c = camp({ pricingModel: "CPC", rateInr: 10, budgetInr: 100 });
    expect(effectiveStatus(c, adv, { impressions: 0, clicks: 9 }, NOW)).toBe("ACTIVE");
    expect(effectiveStatus(c, adv, { impressions: 0, clicks: 10 }, NOW)).toBe("EXHAUSTED");
  });
  it("estimates spend, capped at budget; FLAT has none", () => {
    expect(estimatedSpend(camp(), { impressions: 5, clicks: 5 })).toBeNull();
    expect(estimatedSpend(camp({ pricingModel: "CPM", rateInr: 50, budgetInr: 100 }), { impressions: 1000, clicks: 0 })).toBe(50);
    expect(estimatedSpend(camp({ pricingModel: "CPC", rateInr: 50, budgetInr: 100 }), { impressions: 0, clicks: 99 })).toBe(100);
  });
});

describe("selectCampaigns", () => {
  const base = { advertisers: new Map([["a1", adv], ["a2", { ...adv, id: "a2" }]]), totals: {}, placement: "listings_top" as const, enabled: true, maxItems: 3, now: NOW, rng: () => 0.1 };
  it("returns nothing when the slot is disabled", () => {
    expect(selectCampaigns({ ...base, campaigns: [camp()], enabled: false })).toEqual([]);
  });
  it("shows at most one campaign per advertiser", () => {
    const out = selectCampaigns({ ...base, campaigns: [camp({ id: "c1" }), camp({ id: "c2" }), camp({ id: "c3", advertiserId: "a2" })] });
    expect(out.map((c) => c.advertiserId).sort()).toEqual(["a1", "a2"]);
  });
  it("skips other placements, unsupported formats and non-live campaigns", () => {
    const out = selectCampaigns({ ...base, campaigns: [camp({ id: "x", placement: "home_hero" }), camp({ id: "y", published: false }), camp({ id: "z", format: "SPONSORED_ARTICLE" })] });
    expect(out).toEqual([]);
  });
});

describe("campaignTarget", () => {
  it("only allows site paths and https", () => {
    expect(campaignTarget({ format: "BANNER", targetPath: "/hotels" })).toBe("/hotels");
    expect(campaignTarget({ format: "BANNER", targetPath: "https://x.com" })).toBe("https://x.com");
    expect(campaignTarget({ format: "BANNER", targetPath: "//evil.com" })).toBeNull();
    expect(campaignTarget({ format: "BANNER", targetPath: "javascript:alert(1)" })).toBeNull();
    expect(campaignTarget({ format: "BANNER", targetPath: "http://x.com" })).toBeNull();
  });
  it("builds listing and article targets from ids", () => {
    expect(campaignTarget({ format: "SPONSORED_LISTING", listingType: "hotel", listingId: "h 1" })).toBe("/hotels/h%201");
    expect(campaignTarget({ format: "SPONSORED_ARTICLE", articleSlug: "ghats" })).toBe("/articles/ghats");
    expect(campaignTarget({ format: "SPONSORED_LISTING", listingType: "hotel" })).toBeNull();
  });
});

describe("campaign schema", () => {
  const valid = { title: { en: "Diwali" }, advertiserId: "a1", format: "BANNER", placement: "listings_top", status: "DRAFT", startDate: "2026-10-01", endDate: "2026-10-31", budgetInr: 500, pricingModel: "FLAT", weight: 5, headline: { en: "Hi", te: "" }, images: ["https://x/y.jpg"], targetPath: "/hotels" };
  it("accepts a valid banner", () => expect(campaignSchema.safeParse(valid).success).toBe(true));
  const bad = (patch: object) => campaignSchema.safeParse({ ...valid, ...patch }).success;
  it("rejects bad dates, formats, pricing and targets", () => {
    expect(bad({ endDate: "2026-09-01" })).toBe(false);
    expect(bad({ format: "SPONSORED_ARTICLE", placement: "listings_top" })).toBe(false);
    expect(bad({ pricingModel: "CPC" })).toBe(false);
    expect(bad({ pricingModel: "CPC", rateInr: 5, budgetInr: 0 })).toBe(false);
    expect(bad({ targetPath: "//evil.com" })).toBe(false);
    expect(bad({ images: [] })).toBe(false);
  });
  it("placement schema bounds max items", () => {
    expect(placementSchema.safeParse({ placementKey: "home_hero", name: { en: "Hero" }, enabled: true, maxItems: 0 }).success).toBe(false);
  });
});

function makeDeps(campaigns: CampaignFull[], extra: Partial<AdData> = {}) {
  const store = createMemoryAnalyticsStore();
  const data: AdData = {
    async campaigns(p) { return campaigns.filter((c) => c.placement === p && c.published && c.status === "ACTIVE"); },
    async advertisers() { return [{ ...adv, name: { en: "Acme" } }]; },
    async placementConfig() { return null; },
    async listing() { return null; },
    async article() { return null; },
    async campaignById(id) { return campaigns.find((c) => c.id === id) ?? null; },
    ...extra,
  };
  const deps: ServeDeps = { data, store, now: () => NOW, rng: () => 0.5, rateStore: createMemoryRateStore() };
  return { deps, store };
}

describe("serveAds / registerClick", () => {
  it("returns labelled ads that link through the counted redirect", async () => {
    const { deps } = makeDeps([camp()]);
    const ads = await serveAds(deps, "listings_top", "en");
    expect(ads).toHaveLength(1);
    expect(ads[0]).toMatchObject({ sponsor: "Acme", href: "/r/ad/c1?p=listings_top" });
  });
  it("rejects unknown placements", async () => {
    const { deps } = makeDeps([camp()]);
    expect(await serveAds(deps, "nope", "en")).toEqual([]);
  });
  it("never promotes a listing that is not approved", async () => {
    const { deps } = makeDeps([camp({ format: "SPONSORED_LISTING", placement: "listings_top", listingType: "hotel", listingId: "h1", headline: { en: "x" } })]);
    expect(await serveAds(deps, "listings_top", "en")).toEqual([]);
  });
  it("counts one click per visitor per window and redirects to the stored target", async () => {
    const { deps, store } = makeDeps([camp()]);
    const first = await registerClick(deps, "v1", "c1", "listings_top");
    const second = await registerClick(deps, "v1", "c1", "listings_top");
    const other = await registerClick(deps, "v2", "c1", "listings_top");
    expect(first).toEqual({ target: "/hotels", counted: true });
    expect(second).toEqual({ target: "/hotels", counted: false });
    expect(other.counted).toBe(true);
    expect((await store.adTotals(["c1"])).c1.clicks).toBe(2);
  });
  it("does not count clicks on campaigns that are not live, but still forwards", async () => {
    const { deps, store } = makeDeps([camp({ endDate: "2026-10-01" })]);
    const r = await registerClick(deps, "v1", "c1", "listings_top");
    expect(r).toEqual({ target: "/hotels", counted: false });
    expect((await store.adTotals(["c1"])).c1?.clicks ?? 0).toBe(0);
  });
  it("unknown campaigns have no target (no open redirect)", async () => {
    const { deps } = makeDeps([]);
    expect(await registerClick(deps, "v1", "zzz", "listings_top")).toEqual({ target: null, counted: false });
  });
});
