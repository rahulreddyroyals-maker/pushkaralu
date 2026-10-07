import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import {
  localizedRequired, localizedOptional, geoSchema, hhmmSchema, inrSchema, seoSchema, imagesSchema, eventIdsSchema,
  DEFAULT_GEO, EMPTY_LOCALIZED, EMPTY_SEO, options, imagesField, seoField, eventIdsField,
} from "@/features/catalog/common";

export const PARKING_TYPES = ["open_ground", "multi_level", "roadside", "temporary_event"] as const;
export const PARKING_TYPE_LABELS: Record<(typeof PARKING_TYPES)[number], string> = {
  open_ground: "Open ground",
  multi_level: "Multi-level",
  roadside: "Roadside",
  temporary_event: "Temporary (event) parking",
};

/** Manually maintained by admins — the UI always shows who-knows-when it was last set. */
export const PARKING_STATUSES = ["OPEN", "FILLING", "FULL", "CLOSED"] as const;
export const PARKING_STATUS_LABELS: Record<(typeof PARKING_STATUSES)[number], string> = {
  OPEN: "Open — spaces available",
  FILLING: "Filling up",
  FULL: "Full",
  CLOSED: "Closed",
};

export const VEHICLE_TYPES = ["two_wheeler", "car", "bus", "tempo"] as const;
export const VEHICLE_TYPE_LABELS: Record<(typeof VEHICLE_TYPES)[number], string> = {
  two_wheeler: "Two-wheeler",
  car: "Car",
  bus: "Bus",
  tempo: "Tempo / mini-bus",
};

export const PRICING_UNITS = ["per_hour", "per_day", "per_entry", "free"] as const;
export const PRICING_UNIT_LABELS: Record<(typeof PRICING_UNITS)[number], string> = {
  per_hour: "per hour",
  per_day: "per day",
  per_entry: "per entry",
  free: "free",
};

export const parkingSchema = z.object({
  name: localizedRequired,
  description: localizedOptional,
  images: imagesSchema,
  address: z.string().trim().min(1, "Address is required"),
  location: geoSchema,
  parkingType: z.enum(PARKING_TYPES),
  vehicleTypes: z.array(z.enum(VEHICLE_TYPES)).min(1, "Select at least one vehicle type"),
  capacity: z.number().int().min(1),
  capacityNote: z.string().trim().optional(),
  status: z.enum(PARKING_STATUSES),
  pricing: z
    .array(z.object({ vehicleType: z.enum(VEHICLE_TYPES), unit: z.enum(PRICING_UNITS), amountInr: inrSchema.optional() }))
    .default([]),
  /** Admin-measured walking distances — shown as approximate. */
  ghatDistances: z
    .array(
      z.object({
        ghatName: z.string().trim().min(1, "Ghat name is required"),
        ghatId: z.string().trim().optional(),
        distanceMeters: z.number().int().min(0).max(100_000),
        walkMinutes: z.number().int().min(0).max(600).optional(),
      })
    )
    .default([]),
  facilities: z.array(z.string().trim().min(1)).default([]),
  opensAt: hhmmSchema.optional().or(z.literal("")),
  closesAt: hhmmSchema.optional().or(z.literal("")),
  availableForEvents: eventIdsSchema,
  seo: seoSchema,
});
export type ParkingLocation = CatalogRecord<z.infer<typeof parkingSchema>> & { statusUpdatedAt?: string };

export const parkingDefinition: CatalogDefinition = {
  key: "parking",
  collection: "parkingLocations",
  label: "Parking location",
  labelPlural: "Parking",
  icon: "🅿️",
  publicPath: "/parking",
  auditPrefix: "PARKING",
  imageFolder: "parking",
  schema: parkingSchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: ["status", "parkingType"],
  privateFields: [],
  stampOnChange: [{ field: "status", stampField: "statusUpdatedAt" }],
  dependents: [],
  defaults: {
    name: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, images: [], address: "", location: DEFAULT_GEO,
    parkingType: "open_ground", vehicleTypes: ["car"], capacity: 100, status: "OPEN", pricing: [],
    ghatDistances: [], facilities: [], availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "localized", name: "name", label: "Name" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "text", name: "address", label: "Address" },
    { type: "geo", name: "location", label: "Entrance location (used for navigation)" },
    { type: "select", name: "parkingType", label: "Type", options: options(PARKING_TYPES, PARKING_TYPE_LABELS) },
    { type: "tags", name: "vehicleTypes", label: "Vehicle types", suggestions: options(VEHICLE_TYPES, VEHICLE_TYPE_LABELS) },
    { type: "number", name: "capacity", label: "Capacity (vehicles)" },
    { type: "text", name: "capacityNote", label: "Capacity note", placeholder: "e.g. approx. 60 cars + 40 two-wheelers" },
    { type: "select", name: "status", label: "Current status", options: options(PARKING_STATUSES, PARKING_STATUS_LABELS) },
    {
      type: "list", name: "pricing", label: "Pricing", itemLabel: "Rate",
      itemDefaults: { vehicleType: "car", unit: "per_hour" },
      fields: [
        { type: "select", name: "vehicleType", label: "Vehicle", options: options(VEHICLE_TYPES, VEHICLE_TYPE_LABELS) },
        { type: "select", name: "unit", label: "Charged", options: options(PRICING_UNITS, PRICING_UNIT_LABELS) },
        { type: "number", name: "amountInr", label: "Amount (₹) — blank if free" },
      ],
    },
    {
      type: "list", name: "ghatDistances", label: "Distance to ghats", itemLabel: "Ghat",
      fields: [
        { type: "text", name: "ghatName", label: "Ghat name" },
        { type: "text", name: "ghatId", label: "Ghat ID (optional)" },
        { type: "number", name: "distanceMeters", label: "Walking distance (metres)" },
        { type: "number", name: "walkMinutes", label: "Walking time (minutes)" },
      ],
    },
    { type: "tags", name: "facilities", label: "Facilities", placeholder: "e.g. Security, Drinking water" },
    { type: "time", name: "opensAt", label: "Opens at" },
    { type: "time", name: "closesAt", label: "Closes at" },
    eventIdsField,
    imagesField,
    seoField,
  ],
};
