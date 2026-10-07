import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import {
  localizedRequired, localizedOptional, geoSchema, hhmmSchema, inrSchema, seoSchema, imagesSchema, eventIdsSchema,
  DEFAULT_GEO, EMPTY_LOCALIZED, EMPTY_SEO, options, imagesField, seoField, eventIdsField, WEEKDAY_OPTIONS, WEEKDAY_VALUES,
} from "@/features/catalog/common";

export const DIET_TYPES = ["PURE_VEG", "VEG_AND_NON_VEG", "NON_VEG"] as const;
export const DIET_TYPE_LABELS: Record<(typeof DIET_TYPES)[number], string> = {
  PURE_VEG: "Pure vegetarian",
  VEG_AND_NON_VEG: "Vegetarian & non-vegetarian",
  NON_VEG: "Non-vegetarian",
};
export const PRICE_CATEGORIES = ["BUDGET", "MID_RANGE", "PREMIUM"] as const;
export const PRICE_CATEGORY_LABELS: Record<(typeof PRICE_CATEGORIES)[number], string> = {
  BUDGET: "Budget",
  MID_RANGE: "Mid-range",
  PREMIUM: "Premium",
};

export const restaurantSchema = z.object({
  name: localizedRequired,
  description: localizedRequired,
  images: imagesSchema,
  address: z.string().trim().min(1, "Address is required"),
  location: geoSchema,
  /** Business listing phone — restaurants are public venues, so unlike providers this IS shown (spec Module 9). */
  phone: z.string().trim().min(6, "Enter a valid phone number").optional().or(z.literal("")),
  dietType: z.enum(DIET_TYPES),
  priceCategory: z.enum(PRICE_CATEGORIES),
  averageCostForTwoInr: inrSchema.optional(),
  familyFriendly: z.boolean().default(false),
  cuisines: z.array(z.string().trim().min(1)).default([]),
  opensAt: hhmmSchema.optional().or(z.literal("")),
  closesAt: hhmmSchema.optional().or(z.literal("")),
  closedDays: z.array(z.enum(WEEKDAY_VALUES)).default([]),
  /** Admin override (festival closure, renovation…). Open/closed is otherwise computed from the hours above. */
  temporarilyClosed: z.boolean().default(false),
  nearbyGhatName: z.string().trim().optional(),
  distanceFromGhatMeters: z.number().int().min(0).max(100_000).optional(),
  menuUrl: z.string().url().optional().or(z.literal("")),
  menuHighlights: z.array(z.object({ name: z.string().trim().min(1), priceInr: inrSchema.optional(), vegetarian: z.boolean().default(true) })).default([]),
  availableForEvents: eventIdsSchema,
  seo: seoSchema,
});
export type Restaurant = CatalogRecord<z.infer<typeof restaurantSchema>>;

export const restaurantDefinition: CatalogDefinition = {
  key: "restaurants",
  collection: "restaurants",
  label: "Restaurant",
  labelPlural: "Restaurants",
  icon: "🍽️",
  publicPath: "/restaurants",
  auditPrefix: "RESTAURANT",
  imageFolder: "restaurants",
  schema: restaurantSchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: ["dietType", "priceCategory", "familyFriendly"],
  privateFields: [],
  stampOnChange: [],
  dependents: [],
  defaults: {
    name: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, images: [], address: "", location: DEFAULT_GEO,
    dietType: "PURE_VEG", priceCategory: "BUDGET", familyFriendly: true, cuisines: [], closedDays: [],
    temporarilyClosed: false, menuHighlights: [], availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "localized", name: "name", label: "Name" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "text", name: "address", label: "Address" },
    { type: "geo", name: "location", label: "Location" },
    { type: "text", name: "phone", label: "Phone (shown publicly)" },
    { type: "select", name: "dietType", label: "Food type", options: options(DIET_TYPES, DIET_TYPE_LABELS) },
    { type: "select", name: "priceCategory", label: "Price category", options: options(PRICE_CATEGORIES, PRICE_CATEGORY_LABELS) },
    { type: "number", name: "averageCostForTwoInr", label: "Approx. cost for two (₹)", hint: "Optional, admin-verified." },
    { type: "boolean", name: "familyFriendly", label: "Family friendly" },
    { type: "tags", name: "cuisines", label: "Cuisines", placeholder: "e.g. Andhra meals, Tiffins" },
    { type: "time", name: "opensAt", label: "Opens at" },
    { type: "time", name: "closesAt", label: "Closes at", hint: "A closing time earlier than opening time means after midnight." },
    { type: "tags", name: "closedDays", label: "Weekly closed days (MON, TUE, …)", suggestions: WEEKDAY_OPTIONS },
    { type: "boolean", name: "temporarilyClosed", label: "Temporarily closed (overrides hours)" },
    { type: "text", name: "nearbyGhatName", label: "Nearest ghat" },
    { type: "number", name: "distanceFromGhatMeters", label: "Distance from that ghat (metres)" },
    { type: "text", name: "menuUrl", label: "Menu link (URL)" },
    {
      type: "list", name: "menuHighlights", label: "Menu highlights", itemLabel: "Dish",
      itemDefaults: { vegetarian: true },
      fields: [
        { type: "text", name: "name", label: "Dish" },
        { type: "number", name: "priceInr", label: "Price (₹)" },
        { type: "boolean", name: "vegetarian", label: "Vegetarian" },
      ],
    },
    eventIdsField,
    imagesField,
    seoField,
  ],
};
