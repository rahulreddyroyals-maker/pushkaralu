import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import { localizedOptional, imagesSchema, EMPTY_LOCALIZED, options, imagesField } from "@/features/catalog/common";
import { AD_FORMATS, AD_FORMAT_LABELS, PLACEMENT_KEYS, PLACEMENT_OPTIONS, PLACEMENTS, formatAllowedIn } from "./placements";

/**
 * Sprint 11 advertising data, all admin-only catalogs (no public reads — they
 * hold budgets and advertiser contact details):
 *   advertisers  — who is paying
 *   ad-campaigns — what runs, where, when, for how much
 *   ad-placements — per-slot switches (enabled, how many ads)
 *
 * "Published" has one meaning throughout: APPROVED. A campaign serves only
 * when approved AND status ACTIVE AND inside its dates AND its advertiser is
 * verified (published) and ACTIVE AND budget remains.
 */

const nameEnOnly = z.object({ en: z.string().trim().min(1, "English text is required"), te: z.string().trim().default("") });
const sitePathOrHttps = (v: string) => (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^\s]+$/i.test(v);

export const ADVERTISER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;

export const advertiserSchema = z.object({
  name: nameEnOnly,
  website: z.string().trim().refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use a full https:// address").optional(),
  status: z.enum(ADVERTISER_STATUSES),
  /** Firebase user id of the business owner who may view this advertiser's campaign results on their dashboard. */
  ownerUid: z.string().trim().max(128).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactEmail: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type Advertiser = CatalogRecord<z.infer<typeof advertiserSchema>>;

export const advertiserDefinition: CatalogDefinition = {
  key: "advertisers", collection: "advertisers", label: "Advertiser", labelPlural: "Advertisers", icon: "🏷️",
  publicPath: "/", auditPrefix: "ADVERTISER", imageFolder: "advertisers", schema: advertiserSchema as unknown as CatalogDefinition["schema"],
  titleField: "name", filterKeys: [], privateFields: ["ownerUid", "contactName", "contactPhone", "contactEmail", "notes", "website"],
  stampOnChange: [], dependents: [{ collection: "adCampaigns", field: "advertiserId", label: "ad campaigns" }], adminOnly: true,
  defaults: { name: EMPTY_LOCALIZED, website: "", status: "ACTIVE", ownerUid: "", contactName: "", contactPhone: "", contactEmail: "", notes: "" },
  fields: [
    { type: "localized", name: "name", label: "Advertiser name (Telugu optional)" },
    { type: "select", name: "status", label: "Account status", options: options(ADVERTISER_STATUSES, { ACTIVE: "Active", SUSPENDED: "Suspended — none of their ads serve" }) },
    { type: "text", name: "website", label: "Website (https)" },
    { type: "text", name: "ownerUid", label: "Business owner's user ID", hint: "Lets this person see campaign results in their business dashboard. Leave blank for none." },
    { type: "text", name: "contactName", label: "Contact name (private)" },
    { type: "text", name: "contactPhone", label: "Contact phone (private)" },
    { type: "text", name: "contactEmail", label: "Contact email (private)" },
    { type: "text", name: "notes", label: "Internal notes (private)", multiline: true },
  ],
};

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "CANCELLED"] as const;
export const PRICING_MODELS = ["FLAT", "CPC", "CPM"] as const;
export const LISTING_TYPES = ["hotel", "purohit", "business"] as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date").refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const campaignSchema = z
  .object({
    title: nameEnOnly, // internal campaign name
    advertiserId: z.string().trim().min(1, "Choose an advertiser"),
    format: z.enum(AD_FORMATS),
    placement: z.enum(PLACEMENT_KEYS),
    status: z.enum(CAMPAIGN_STATUSES),
    startDate: isoDate,
    endDate: isoDate,
    budgetInr: z.number().int("Whole rupees only").min(0),
    pricingModel: z.enum(PRICING_MODELS),
    /** ₹ per click (CPC) or per 1,000 impressions (CPM). Not used for FLAT. */
    rateInr: z.number().min(0).max(1_000_000).optional(),
    weight: z.number().int().min(1).max(10).default(5),
    headline: nameEnOnly.optional(), // English required, Telugu optional (the form says so)
    body: localizedOptional,
    ctaLabel: localizedOptional,
    images: imagesSchema,
    targetPath: z.string().trim().optional().or(z.literal("")),
    listingType: z.enum(LISTING_TYPES).optional(),
    listingId: z.string().trim().max(128).optional().or(z.literal("")),
    articleSlug: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.endDate < v.startDate) add("endDate", "End date must be on or after the start date");
    if (!formatAllowedIn(v.format, v.placement)) {
      add("placement", `${PLACEMENTS[v.placement].label} supports: ${PLACEMENTS[v.placement].formats.map((f) => AD_FORMAT_LABELS[f].split(" (")[0]).join(", ")}`);
    }
    if ((v.pricingModel === "CPC" || v.pricingModel === "CPM") && !(v.rateInr && v.rateInr > 0)) add("rateInr", "Enter the rate for CPC / CPM pricing");
    if (v.pricingModel !== "FLAT" && v.budgetInr <= 0) add("budgetInr", "CPC / CPM campaigns need a budget cap above 0");
    if (v.format === "BANNER" || v.format === "HOMEPAGE_PROMOTION") {
      if (!v.headline?.en) add("headline", "Headline is required");
      if (!v.targetPath || !sitePathOrHttps(v.targetPath)) add("targetPath", "Enter a site path (/hotels) or an https:// link");
      if (v.format === "BANNER" && v.images.length === 0) add("images", "A banner needs an image");
    }
    if (v.format === "SPONSORED_LISTING") {
      if (!v.listingType) add("listingType", "Choose the listing type");
      if (!v.listingId) add("listingId", "Enter the listing id (from its page URL)");
      if (!v.headline?.en) add("headline", "Headline is required");
    }
    if (v.format === "SPONSORED_ARTICLE") {
      if (!v.articleSlug) add("articleSlug", "Enter the article slug");
      if (!v.headline?.en) add("headline", "Headline is required");
    }
  });
export type AdCampaign = CatalogRecord<z.infer<typeof campaignSchema>>;

export const campaignDefinition: CatalogDefinition = {
  key: "ad-campaigns", collection: "adCampaigns", label: "Ad campaign", labelPlural: "Ad campaigns", icon: "📣",
  publicPath: "/", auditPrefix: "AD_CAMPAIGN", imageFolder: "ads", schema: campaignSchema as unknown as CatalogDefinition["schema"],
  titleField: "title", filterKeys: ["status", "placement"], privateFields: [], stampOnChange: [], dependents: [], adminOnly: true,
  defaults: {
    title: EMPTY_LOCALIZED, advertiserId: "", format: "BANNER", placement: "listings_top", status: "DRAFT", startDate: "", endDate: "",
    budgetInr: 0, pricingModel: "FLAT", weight: 5, headline: EMPTY_LOCALIZED, body: EMPTY_LOCALIZED, ctaLabel: EMPTY_LOCALIZED, images: [],
    targetPath: "", listingId: "", articleSlug: "",
  },
  fields: [
    { type: "localized", name: "title", label: "Campaign name (internal)" },
    { type: "ref", name: "advertiserId", label: "Advertiser", refKey: "advertisers" },
    { type: "select", name: "format", label: "Format", options: options(AD_FORMATS, AD_FORMAT_LABELS) },
    { type: "select", name: "placement", label: "Placement", options: PLACEMENT_OPTIONS },
    { type: "select", name: "status", label: "Status", options: options(CAMPAIGN_STATUSES, { DRAFT: "Draft", ACTIVE: "Active (runs once approved)", PAUSED: "Paused", CANCELLED: "Cancelled" }) },
    { type: "date", name: "startDate", label: "Start date (India time, inclusive)" },
    { type: "date", name: "endDate", label: "End date (India time, inclusive)" },
    { type: "number", name: "budgetInr", label: "Budget (₹)", hint: "FLAT: the agreed fee. CPC/CPM: a hard cap — the ad stops serving when estimated spend reaches it." },
    { type: "select", name: "pricingModel", label: "Pricing model", options: options(PRICING_MODELS, { FLAT: "Flat fee", CPC: "Cost per click", CPM: "Cost per 1,000 impressions" }) },
    { type: "number", name: "rateInr", label: "Rate (₹ per click / per 1,000 impressions)", step: "0.01" },
    { type: "number", name: "weight", label: "Rotation weight (1–10)", hint: "Higher = shown more often when several campaigns share a placement." },
    { type: "localized", name: "headline", label: "Headline (shown to visitors; Telugu optional)" },
    { type: "localized", name: "body", label: "Short text (optional)", multiline: true },
    { type: "localized", name: "ctaLabel", label: "Button label (optional)" },
    imagesField,
    { type: "text", name: "targetPath", label: "Link (banner / homepage promotion)", placeholder: "/hotels or https://…" },
    { type: "select", name: "listingType", label: "Listing type (sponsored listing)", options: LISTING_TYPES.map((v) => ({ value: v, label: v })) },
    { type: "text", name: "listingId", label: "Listing id (sponsored listing)" },
    { type: "text", name: "articleSlug", label: "Article slug (sponsored article)" },
  ],
};

export const placementSchema = z.object({
  placementKey: z.enum(PLACEMENT_KEYS),
  name: nameEnOnly,
  enabled: z.boolean().default(true),
  maxItems: z.number().int().min(1).max(6),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const placementDefinition: CatalogDefinition = {
  key: "ad-placements", collection: "adPlacements", label: "Ad placement", labelPlural: "Ad placements", icon: "🧩",
  publicPath: "/", auditPrefix: "AD_PLACEMENT", imageFolder: "ads", schema: placementSchema as unknown as CatalogDefinition["schema"],
  titleField: "name", filterKeys: [], privateFields: [], stampOnChange: [], dependents: [], adminOnly: true, uniqueFields: ["placementKey"],
  defaults: { placementKey: "home_hero", name: EMPTY_LOCALIZED, enabled: true, maxItems: 1, notes: "" },
  fields: [
    { type: "select", name: "placementKey", label: "Slot", options: PLACEMENT_OPTIONS },
    { type: "localized", name: "name", label: "Display name" },
    { type: "boolean", name: "enabled", label: "Enabled (off = nothing serves in this slot)" },
    { type: "number", name: "maxItems", label: "Max ads shown at once" },
    { type: "text", name: "notes", label: "Notes", multiline: true },
  ],
};

export const AD_DEFINITIONS: CatalogDefinition[] = [advertiserDefinition, campaignDefinition, placementDefinition];
