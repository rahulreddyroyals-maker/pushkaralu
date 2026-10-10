import { z } from "zod";
import type { CatalogDefinition, CatalogRecord, FieldDescriptor } from "@/lib/catalog/types";
import { geoSchema, imagesSchema, eventIdsSchema, EMPTY_LOCALIZED, options, imagesField, eventIdsField } from "@/features/catalog/common";
import { isValidSlug } from "@/lib/seo/text";

/**
 * Sprint 9 Content CMS — articles, pilgrim guides, FAQs, location pages and
 * service pages. Each is a catalog definition (so admin CRUD, audit logging,
 * draft/publish and pagination come from the shared registry) addressed
 * publicly by an admin-chosen, unique `slug`.
 *
 * Bilingual rule: English is required; Telugu is optional. A page is only
 * served at /te/... (and advertised via hreflang) when its Telugu title AND
 * body exist, so search engines never see an English page labelled Telugu.
 */

export const CONTENT_TOPICS = ["overview", "dates", "ghats", "hotels", "purohits", "rituals", "travel", "parking", "temples", "safety", "food"] as const;
export type ContentTopic = (typeof CONTENT_TOPICS)[number];
export const CONTENT_TOPIC_LABELS: Record<ContentTopic, string> = {
  overview: "Overview",
  dates: "Dates & schedule",
  ghats: "Ghats & bathing",
  hotels: "Where to stay",
  purohits: "Purohits & services",
  rituals: "Rituals",
  travel: "Getting there",
  parking: "Parking",
  temples: "Temples",
  safety: "Safety & health",
  food: "Food",
};

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(isValidSlug, "Slug: 3–100 characters, lowercase letters, digits and single hyphens (e.g. godavari-ghat-timings)");

const requiredEnOptionalTe = z.object({ en: z.string().trim().min(1, "English text is required"), te: z.string().trim().default("") });
const optionalBoth = z.object({ en: z.string().trim().default(""), te: z.string().trim().default("") }).default({ en: "", te: "" });

/** Fields shared by every content type. */
const base = {
  slug: slugSchema,
  title: requiredEnOptionalTe,
  summary: optionalBoth,
  body: requiredEnOptionalTe,
  topic: z.enum(CONTENT_TOPICS),
  images: imagesSchema,
  /** Optional overrides — when blank the page title / summary are used. */
  seoTitle: optionalBoth,
  seoDescription: optionalBoth,
  /** Keep a published page out of search results (and the sitemap) without unpublishing it. */
  noindex: z.boolean().default(false),
  availableForEvents: eventIdsSchema,
};

export const articleSchema = z.object({ ...base, authorName: z.string().trim().max(80).optional().or(z.literal("")), tags: z.array(z.string().trim().min(1)).default([]) });
export const guideSchema = z.object({ ...base, tags: z.array(z.string().trim().min(1)).default([]) });
export const faqSchema = z.object({ ...base, summary: optionalBoth });
export const locationPageSchema = z.object({
  ...base,
  locationName: z.string().trim().min(1, "Place name is required").max(120),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  location: geoSchema.optional(),
});
export const servicePageSchema = z.object({
  ...base,
  ctaLabel: optionalBoth,
  /** Where the call-to-action button goes — a site path only (e.g. /hotels). */
  ctaPath: z.string().trim().refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")), "Use a site path starting with / (e.g. /hotels)").optional(),
});

export type ContentRecord = CatalogRecord<z.infer<typeof articleSchema>> & {
  authorName?: string;
  tags?: string[];
  locationName?: string;
  address?: string;
  location?: { latitude: number; longitude: number };
  ctaLabel?: { en: string; te: string };
  ctaPath?: string;
};

const baseDefaults = {
  slug: "", title: EMPTY_LOCALIZED, summary: EMPTY_LOCALIZED, body: EMPTY_LOCALIZED, topic: "overview", images: [],
  seoTitle: EMPTY_LOCALIZED, seoDescription: EMPTY_LOCALIZED, noindex: false, availableForEvents: [],
};

const topicField: FieldDescriptor = { type: "select", name: "topic", label: "Topic", options: options(CONTENT_TOPICS, CONTENT_TOPIC_LABELS) };
const slugField: FieldDescriptor = { type: "text", name: "slug", label: "URL slug", placeholder: "e.g. godavari-pushkaralu-ghat-timings", hint: "Used in the public URL and must be unique. Changing it later breaks existing links — avoid after publishing." };
const seoFields: FieldDescriptor[] = [
  { type: "localized", name: "seoTitle", label: "SEO title (optional — defaults to the title)" },
  { type: "localized", name: "seoDescription", label: "SEO description (optional — defaults to the summary)", multiline: true },
  { type: "boolean", name: "noindex", label: "Hide from search engines (noindex)" },
];

function make(partial: Pick<CatalogDefinition, "key" | "collection" | "label" | "labelPlural" | "icon" | "publicPath" | "auditPrefix" | "imageFolder"> & {
  schema: z.ZodTypeAny;
  fields: FieldDescriptor[];
  defaults?: Record<string, unknown>;
}): CatalogDefinition {
  return {
    ...partial,
    schema: partial.schema as unknown as CatalogDefinition["schema"],
    titleField: "title",
    filterKeys: ["topic"],
    privateFields: [],
    stampOnChange: [],
    dependents: [],
    uniqueFields: ["slug"],
    slugRouted: true,
    defaults: { ...baseDefaults, ...(partial.defaults ?? {}) },
  };
}

const bodyFields = (bodyLabel = "Body (Markdown)"): FieldDescriptor[] => [
  { type: "localized", name: "summary", label: "Summary (shown in lists and search snippets)", multiline: true },
  { type: "localized", name: "body", label: bodyLabel, multiline: true },
];

export const articleDefinition = make({
  key: "articles", collection: "contentArticles", label: "Article", labelPlural: "Articles", icon: "📰",
  publicPath: "/articles", auditPrefix: "ARTICLE", imageFolder: "articles", schema: articleSchema,
  defaults: { authorName: "", tags: [] },
  fields: [
    { type: "localized", name: "title", label: "Title" }, slugField, topicField, ...bodyFields(),
    { type: "text", name: "authorName", label: "Author (optional)" },
    { type: "tags", name: "tags", label: "Tags" }, eventIdsField, imagesField, ...seoFields,
  ],
});

export const guideDefinition = make({
  key: "pilgrim-guides", collection: "contentGuides", label: "Pilgrim guide", labelPlural: "Pilgrim guides", icon: "🧭",
  publicPath: "/pilgrim-guides", auditPrefix: "GUIDE", imageFolder: "pilgrim-guides", schema: guideSchema,
  defaults: { tags: [] },
  fields: [{ type: "localized", name: "title", label: "Title" }, slugField, topicField, ...bodyFields("Guide (Markdown — use ## headings for steps)"), { type: "tags", name: "tags", label: "Tags" }, eventIdsField, imagesField, ...seoFields],
});

export const faqDefinition = make({
  key: "faqs", collection: "contentFaqs", label: "FAQ", labelPlural: "FAQs", icon: "❓",
  publicPath: "/faqs", auditPrefix: "FAQ", imageFolder: "faqs", schema: faqSchema,
  fields: [
    { type: "localized", name: "title", label: "Question" }, slugField, topicField,
    { type: "localized", name: "body", label: "Answer (Markdown — answer directly in the first sentence)", multiline: true },
    eventIdsField, ...seoFields,
  ],
});

export const locationPageDefinition = make({
  key: "location-pages", collection: "contentLocations", label: "Location page", labelPlural: "Location pages", icon: "📍",
  publicPath: "/locations", auditPrefix: "LOCATION_PAGE", imageFolder: "locations", schema: locationPageSchema,
  defaults: { locationName: "", address: "" },
  fields: [
    { type: "localized", name: "title", label: "Title" }, slugField, topicField,
    { type: "text", name: "locationName", label: "Place name", placeholder: "e.g. Kotilingala Ghat, Rajahmundry" },
    { type: "text", name: "address", label: "Address (optional)" },
    { type: "geo", name: "location", label: "Coordinates (optional)", optional: true },
    ...bodyFields(), eventIdsField, imagesField, ...seoFields,
  ],
});

export const servicePageDefinition = make({
  key: "service-pages", collection: "contentServices", label: "Service page", labelPlural: "Service pages", icon: "🛎️",
  publicPath: "/services", auditPrefix: "SERVICE_PAGE", imageFolder: "services", schema: servicePageSchema,
  defaults: { ctaLabel: EMPTY_LOCALIZED, ctaPath: "" },
  fields: [
    { type: "localized", name: "title", label: "Title" }, slugField, topicField, ...bodyFields(),
    { type: "localized", name: "ctaLabel", label: "Button label (optional)" },
    { type: "text", name: "ctaPath", label: "Button link (site path)", placeholder: "/hotels" },
    eventIdsField, imagesField, ...seoFields,
  ],
});

export const CONTENT_DEFINITIONS: CatalogDefinition[] = [articleDefinition, guideDefinition, faqDefinition, locationPageDefinition, servicePageDefinition];
