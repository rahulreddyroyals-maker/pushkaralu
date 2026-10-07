import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import {
  localizedRequired, localizedOptional, geoSchema, hhmmSchema, inrSchema, seoSchema, imagesSchema, eventIdsSchema,
  DEFAULT_GEO, EMPTY_LOCALIZED, EMPTY_SEO, options, imagesField, seoField, eventIdsField,
} from "@/features/catalog/common";

/* ───────────── Tourist destinations & temple tourism ───────────── */

export const PLACE_KINDS = ["DESTINATION", "TEMPLE", "NATURE", "HERITAGE", "ADVENTURE"] as const;
export const PLACE_KIND_LABELS: Record<(typeof PLACE_KINDS)[number], string> = {
  DESTINATION: "Tourist destination",
  TEMPLE: "Temple tourism",
  NATURE: "Nature & river",
  HERITAGE: "Heritage",
  ADVENTURE: "Adventure",
};

export const tourismPlaceSchema = z.object({
  kind: z.enum(PLACE_KINDS),
  name: localizedRequired,
  tagline: localizedOptional,
  description: localizedRequired,
  /** Religious / cultural significance as supplied by the admin from verified sources — the platform adds no claims of its own. */
  significance: localizedOptional,
  images: imagesSchema,
  address: z.string().trim().min(1, "Address is required"),
  location: geoSchema,
  bestTimeToVisit: localizedOptional,
  timings: z.string().trim().optional(),
  entryFeeInr: inrSchema.optional(),
  entryFeeNote: localizedOptional,
  suggestedDurationMinutes: z.number().int().min(10).max(24 * 60).optional(),
  dressCode: localizedOptional,
  facilities: z.array(z.string().trim().min(1)).default([]),
  distanceNote: localizedOptional,
  availableForEvents: eventIdsSchema,
  seo: seoSchema,
});
export type TourismPlace = CatalogRecord<z.infer<typeof tourismPlaceSchema>>;

export const tourismPlaceDefinition: CatalogDefinition = {
  key: "tourism",
  collection: "tourismPlaces",
  label: "Tourism place",
  labelPlural: "Tourism",
  icon: "🏞️",
  publicPath: "/tourism",
  auditPrefix: "TOURISM_PLACE",
  imageFolder: "tourism",
  schema: tourismPlaceSchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: ["kind"],
  privateFields: [],
  stampOnChange: [],
  dependents: [],
  defaults: {
    kind: "DESTINATION", name: EMPTY_LOCALIZED, tagline: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED,
    significance: EMPTY_LOCALIZED, images: [], address: "", location: DEFAULT_GEO, bestTimeToVisit: EMPTY_LOCALIZED,
    entryFeeNote: EMPTY_LOCALIZED, dressCode: EMPTY_LOCALIZED, facilities: [], distanceNote: EMPTY_LOCALIZED,
    availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "select", name: "kind", label: "Category", options: options(PLACE_KINDS, PLACE_KIND_LABELS) },
    { type: "localized", name: "name", label: "Name" },
    { type: "localized", name: "tagline", label: "Tagline" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "localized", name: "significance", label: "Significance (temple tourism)", multiline: true },
    { type: "text", name: "address", label: "Address" },
    { type: "geo", name: "location", label: "Location" },
    { type: "localized", name: "bestTimeToVisit", label: "Best time to visit" },
    { type: "text", name: "timings", label: "Timings" },
    { type: "number", name: "entryFeeInr", label: "Entry fee (₹) — blank if none/unknown" },
    { type: "localized", name: "entryFeeNote", label: "Entry fee note" },
    { type: "number", name: "suggestedDurationMinutes", label: "Suggested visit time (minutes)" },
    { type: "localized", name: "dressCode", label: "Dress code / etiquette" },
    { type: "tags", name: "facilities", label: "Facilities", placeholder: "e.g. Drinking water, Wheelchair access" },
    { type: "localized", name: "distanceNote", label: "Getting there" },
    eventIdsField,
    imagesField,
    seoField,
  ],
};

/* ───────────── Itineraries (one-day & multi-day) ───────────── */

export const SUITABLE_FOR = ["FAMILY", "ELDERLY", "SOLO", "GROUP", "PILGRIMS"] as const;
export const SUITABLE_FOR_LABELS: Record<(typeof SUITABLE_FOR)[number], string> = {
  FAMILY: "Families",
  ELDERLY: "Elderly travellers",
  SOLO: "Solo travellers",
  GROUP: "Groups",
  PILGRIMS: "Pilgrims",
};

const stopSchema = z.object({
  time: hhmmSchema.optional().or(z.literal("")),
  title: localizedRequired,
  description: localizedOptional,
  placeId: z.string().optional(),
  durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
});

export const itinerarySchema = z
  .object({
    title: localizedRequired,
    summary: localizedRequired,
    images: imagesSchema,
    durationDays: z.number().int().min(1, "At least 1 day").max(14),
    suitableFor: z.array(z.enum(SUITABLE_FOR)).default([]),
    days: z
      .array(z.object({ title: localizedRequired, stops: z.array(stopSchema).min(1, "Add at least one stop") }))
      .min(1, "Add at least one day"),
    tips: localizedOptional,
    availableForEvents: eventIdsSchema,
    seo: seoSchema,
  })
  .superRefine((v, ctx) => {
    if (v.days.length !== v.durationDays) {
      ctx.addIssue({ code: "custom", path: ["days"], message: `Duration is ${v.durationDays} day(s) but ${v.days.length} day(s) are listed` });
    }
  });
export type Itinerary = CatalogRecord<z.infer<typeof itinerarySchema>> & { tripType: "ONE_DAY" | "MULTI_DAY" };

export const itineraryDefinition: CatalogDefinition = {
  key: "itineraries",
  collection: "itineraries",
  label: "Itinerary",
  labelPlural: "Itineraries",
  icon: "🗺️",
  publicPath: "/tourism/itineraries",
  auditPrefix: "ITINERARY",
  imageFolder: "itineraries",
  schema: itinerarySchema as unknown as CatalogDefinition["schema"],
  titleField: "title",
  filterKeys: ["tripType"],
  privateFields: [],
  stampOnChange: [],
  dependents: [{ collection: "travelPackages", field: "itineraryId", label: "travel packages" }],
  derive: (data) => ({ tripType: Number(data.durationDays) <= 1 ? "ONE_DAY" : "MULTI_DAY" }),
  defaults: {
    title: EMPTY_LOCALIZED, summary: EMPTY_LOCALIZED, images: [], durationDays: 1, suitableFor: [],
    days: [{ title: EMPTY_LOCALIZED, stops: [] }], tips: EMPTY_LOCALIZED, availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "localized", name: "title", label: "Title" },
    { type: "localized", name: "summary", label: "Summary", multiline: true },
    { type: "number", name: "durationDays", label: "Duration (days)", hint: "1 = one-day itinerary. The number of day blocks below must match." },
    { type: "tags", name: "suitableFor", label: "Suitable for", suggestions: options(SUITABLE_FOR, SUITABLE_FOR_LABELS) },
    {
      type: "list", name: "days", label: "Days", itemLabel: "Day",
      itemDefaults: { title: EMPTY_LOCALIZED, stops: [] },
      fields: [
        { type: "localized", name: "title", label: "Day title" },
        {
          type: "list", name: "stops", label: "Stops", itemLabel: "Stop",
          itemDefaults: { title: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED },
          fields: [
            { type: "time", name: "time", label: "Time" },
            { type: "localized", name: "title", label: "Stop" },
            { type: "localized", name: "description", label: "Details", multiline: true },
            { type: "ref", name: "placeId", label: "Tourism place (optional)", refKey: "tourism", optional: true },
            { type: "number", name: "durationMinutes", label: "Duration (minutes)" },
          ],
        },
      ],
    },
    { type: "localized", name: "tips", label: "Travel tips", multiline: true },
    eventIdsField,
    imagesField,
    seoField,
  ],
};

/* ───────────── Travel packages ───────────── */

export const travelPackageSchema = z.object({
  title: localizedRequired,
  summary: localizedRequired,
  description: localizedRequired,
  images: imagesSchema,
  durationDays: z.number().int().min(1).max(30),
  nights: z.number().int().min(0).max(29),
  /** Indicative "from" price per person. Blank = price on request. */
  priceFromInr: inrSchema.optional(),
  priceNote: localizedOptional,
  departureCity: z.string().trim().optional(),
  itineraryId: z.string().optional(),
  inclusions: z.array(z.string().trim().min(1)).default([]),
  exclusions: z.array(z.string().trim().min(1)).default([]),
  departures: z.array(z.object({ date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"), note: z.string().trim().optional() })).default([]),
  cancellationPolicy: localizedOptional,
  /** Who runs the package — shown as text; inquiries are handled by the platform team. */
  operatorName: z.string().trim().optional(),
  availableForEvents: eventIdsSchema,
  seo: seoSchema,
});
export type TravelPackage = CatalogRecord<z.infer<typeof travelPackageSchema>>;

export const travelPackageDefinition: CatalogDefinition = {
  key: "packages",
  collection: "travelPackages",
  label: "Travel package",
  labelPlural: "Packages",
  icon: "🎒",
  publicPath: "/packages",
  auditPrefix: "PACKAGE",
  imageFolder: "packages",
  schema: travelPackageSchema as unknown as CatalogDefinition["schema"],
  titleField: "title",
  filterKeys: ["itineraryId"],
  privateFields: [],
  stampOnChange: [],
  dependents: [],
  defaults: {
    title: EMPTY_LOCALIZED, summary: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, images: [], durationDays: 2, nights: 1,
    priceNote: EMPTY_LOCALIZED, inclusions: [], exclusions: [], departures: [], cancellationPolicy: EMPTY_LOCALIZED,
    availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "localized", name: "title", label: "Title" },
    { type: "localized", name: "summary", label: "Summary" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "number", name: "durationDays", label: "Days" },
    { type: "number", name: "nights", label: "Nights" },
    { type: "number", name: "priceFromInr", label: "Price from (₹ per person)", hint: "Indicative. Leave empty for 'price on request'." },
    { type: "localized", name: "priceNote", label: "Price note", multiline: true },
    { type: "text", name: "departureCity", label: "Departure city" },
    { type: "text", name: "operatorName", label: "Operator (display name)" },
    { type: "ref", name: "itineraryId", label: "Itinerary (optional)", refKey: "itineraries", optional: true },
    { type: "tags", name: "inclusions", label: "Inclusions" },
    { type: "tags", name: "exclusions", label: "Exclusions" },
    {
      type: "list", name: "departures", label: "Departure dates", itemLabel: "Departure",
      fields: [
        { type: "date", name: "date", label: "Date" },
        { type: "text", name: "note", label: "Note" },
      ],
    },
    { type: "localized", name: "cancellationPolicy", label: "Cancellation policy", multiline: true },
    eventIdsField,
    imagesField,
    seoField,
  ],
};
