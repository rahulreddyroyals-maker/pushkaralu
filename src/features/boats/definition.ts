import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import {
  localizedRequired, localizedOptional, geoSchema, hhmmSchema, inrSchema, seoSchema, imagesSchema, eventIdsSchema,
  DEFAULT_GEO, EMPTY_LOCALIZED, EMPTY_SEO, options, imagesField, seoField, eventIdsField, WEEKDAY_OPTIONS, WEEKDAY_VALUES,
} from "@/features/catalog/common";

/* ───────────── Boat operators ───────────── */

export const boatOperatorSchema = z.object({
  name: localizedRequired,
  description: localizedRequired,
  images: imagesSchema,
  address: z.string().trim().min(1, "Address is required"),
  /** Main jetty / boarding point. */
  location: geoSchema,
  /** Licence / permit reference exactly as verified by the admin. Shown only if filled. */
  licenceNote: z.string().trim().optional(),
  /** PRIVATE. */
  contactPhone: z.string().trim().min(6, "Enter a valid phone number"),
  availableForEvents: eventIdsSchema,
  seo: seoSchema,
});
export type BoatOperator = CatalogRecord<z.infer<typeof boatOperatorSchema>>;

export const boatOperatorDefinition: CatalogDefinition = {
  key: "boat-operators",
  collection: "boatOperators",
  label: "Boat operator",
  labelPlural: "Boat operators",
  icon: "⚓",
  publicPath: "/boats/operators",
  auditPrefix: "BOAT_OPERATOR",
  imageFolder: "boat-operators",
  schema: boatOperatorSchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: [],
  privateFields: ["contactPhone"],
  stampOnChange: [],
  dependents: [
    { collection: "boats", field: "operatorId", label: "boats" },
    { collection: "boatRoutes", field: "operatorId", label: "boat routes" },
  ],
  defaults: {
    name: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, images: [], address: "", location: DEFAULT_GEO,
    contactPhone: "", availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "localized", name: "name", label: "Operator name" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "text", name: "address", label: "Address" },
    { type: "geo", name: "location", label: "Main jetty / boarding point" },
    { type: "text", name: "licenceNote", label: "Licence / permit reference", hint: "Only enter what has been verified. Shown publicly when filled." },
    { type: "text", name: "contactPhone", label: "Operator phone (private — not shown publicly)" },
    eventIdsField,
    imagesField,
    seoField,
  ],
};

/* ───────────── Boats ───────────── */

export const BOAT_TYPES = ["motor_boat", "speed_boat", "row_boat", "houseboat", "cruise"] as const;
export const BOAT_TYPE_LABELS: Record<(typeof BOAT_TYPES)[number], string> = {
  motor_boat: "Motor boat",
  speed_boat: "Speed boat",
  row_boat: "Row boat",
  houseboat: "Houseboat",
  cruise: "Cruise",
};
export const BOAT_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;
export const BOAT_STATUS_LABELS: Record<(typeof BOAT_STATUSES)[number], string> = {
  ACTIVE: "In service",
  MAINTENANCE: "Under maintenance",
  INACTIVE: "Not in service",
};

export const boatSchema = z.object({
  operatorId: z.string().min(1, "Choose an operator"),
  name: localizedRequired,
  boatType: z.enum(BOAT_TYPES),
  capacity: z.number().int().min(1).max(500),
  images: imagesSchema,
  lifeJacketsProvided: z.boolean().default(false),
  safetyFeatures: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(BOAT_STATUSES),
  seo: seoSchema,
});
export type Boat = CatalogRecord<z.infer<typeof boatSchema>>;

export const boatDefinition: CatalogDefinition = {
  key: "boats",
  collection: "boats",
  label: "Boat",
  labelPlural: "Boats",
  icon: "🛶",
  publicPath: "/boats/fleet",
  auditPrefix: "BOAT",
  imageFolder: "boats",
  schema: boatSchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: ["operatorId", "boatType"],
  privateFields: [],
  stampOnChange: [{ field: "status", stampField: "statusUpdatedAt" }],
  dependents: [{ collection: "boatRoutes", field: "boatId", label: "boat routes" }],
  defaults: {
    operatorId: "", name: EMPTY_LOCALIZED, boatType: "motor_boat", capacity: 10, images: [],
    lifeJacketsProvided: false, safetyFeatures: [], status: "ACTIVE", seo: EMPTY_SEO,
  },
  fields: [
    { type: "ref", name: "operatorId", label: "Operator", refKey: "boat-operators" },
    { type: "localized", name: "name", label: "Boat name" },
    { type: "select", name: "boatType", label: "Type", options: options(BOAT_TYPES, BOAT_TYPE_LABELS) },
    { type: "number", name: "capacity", label: "Passenger capacity" },
    { type: "boolean", name: "lifeJacketsProvided", label: "Life jackets provided for all passengers" },
    { type: "tags", name: "safetyFeatures", label: "Safety features", placeholder: "e.g. First-aid kit, Life buoys" },
    { type: "select", name: "status", label: "Service status", options: options(BOAT_STATUSES, BOAT_STATUS_LABELS) },
    imagesField,
    seoField,
  ],
};

/* ───────────── Boat routes (with schedules, duration, pricing, safety) ───────────── */

export const boatRouteSchema = z.object({
  operatorId: z.string().min(1, "Choose an operator"),
  boatId: z.string().optional(),
  title: localizedRequired,
  description: localizedRequired,
  images: imagesSchema,
  startPointName: z.string().trim().min(1, "Boarding point is required"),
  endPointName: z.string().trim().optional(),
  startLocation: geoSchema,
  durationMinutes: z.number().int().min(5).max(24 * 60),
  /** Per adult, indicative. Leave out for "price on request". */
  adultPriceInr: inrSchema.optional(),
  childPriceInr: inrSchema.optional(),
  pricingNote: localizedOptional,
  schedules: z
    .array(z.object({ days: z.array(z.enum(WEEKDAY_VALUES)).min(1, "Pick at least one day"), departureTime: hhmmSchema, notes: z.string().trim().optional() }))
    .default([]),
  /** Required: no route is published without admin-written safety information. */
  safetyInfo: localizedRequired,
  minimumAge: z.number().int().min(0).max(18).optional(),
  weatherNote: localizedOptional,
  active: z.boolean().default(true),
  availableForEvents: eventIdsSchema,
  seo: seoSchema,
});
export type BoatRoute = CatalogRecord<z.infer<typeof boatRouteSchema>>;

export const boatRouteDefinition: CatalogDefinition = {
  key: "boat-routes",
  collection: "boatRoutes",
  label: "Boat route",
  labelPlural: "Boat routes",
  icon: "🌊",
  publicPath: "/boats",
  auditPrefix: "BOAT_ROUTE",
  imageFolder: "boat-routes",
  schema: boatRouteSchema as unknown as CatalogDefinition["schema"],
  titleField: "title",
  filterKeys: ["operatorId", "active"],
  privateFields: [],
  stampOnChange: [],
  dependents: [],
  defaults: {
    operatorId: "", title: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, images: [], startPointName: "",
    startLocation: DEFAULT_GEO, durationMinutes: 60, pricingNote: EMPTY_LOCALIZED, schedules: [],
    safetyInfo: EMPTY_LOCALIZED, weatherNote: EMPTY_LOCALIZED, active: true, availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "ref", name: "operatorId", label: "Operator", refKey: "boat-operators" },
    { type: "ref", name: "boatId", label: "Boat (optional)", refKey: "boats", optional: true },
    { type: "localized", name: "title", label: "Route title" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "text", name: "startPointName", label: "Boarding point name" },
    { type: "text", name: "endPointName", label: "Drop-off / turnaround point name" },
    { type: "geo", name: "startLocation", label: "Boarding point location" },
    { type: "number", name: "durationMinutes", label: "Duration (minutes)" },
    { type: "number", name: "adultPriceInr", label: "Adult price (₹)", hint: "Indicative. Leave empty if price is on request." },
    { type: "number", name: "childPriceInr", label: "Child price (₹)" },
    { type: "localized", name: "pricingNote", label: "Pricing note", multiline: true },
    {
      type: "list", name: "schedules", label: "Schedule", itemLabel: "Departure",
      itemDefaults: { days: [], departureTime: "06:00" },
      fields: [
        { type: "tags", name: "days", label: "Days (MON, TUE, …)", suggestions: WEEKDAY_OPTIONS },
        { type: "time", name: "departureTime", label: "Departure time" },
        { type: "text", name: "notes", label: "Notes" },
      ],
    },
    { type: "localized", name: "safetyInfo", label: "Safety information", multiline: true },
    { type: "number", name: "minimumAge", label: "Minimum age (years)" },
    { type: "localized", name: "weatherNote", label: "Weather / river-level note", multiline: true },
    { type: "boolean", name: "active", label: "Route is currently operating" },
    eventIdsField,
    imagesField,
    seoField,
  ],
};
