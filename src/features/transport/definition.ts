import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import {
  localizedRequired, localizedOptional, geoSchema, hhmmSchema, inrSchema, seoSchema, imagesSchema, eventIdsSchema,
  DEFAULT_GEO, EMPTY_LOCALIZED, EMPTY_SEO, options, imagesField, seoField, eventIdsField,
} from "@/features/catalog/common";

export const TRANSPORT_KINDS = ["taxi", "auto", "airport_transfer", "railway_transfer", "local_travel", "bus", "train", "tour_operator"] as const;
export const TRANSPORT_KIND_LABELS: Record<(typeof TRANSPORT_KINDS)[number], string> = {
  taxi: "Taxi",
  auto: "Auto-rickshaw",
  airport_transfer: "Airport transfer",
  railway_transfer: "Railway station transfer",
  local_travel: "Local travel",
  bus: "Bus",
  train: "Train",
  tour_operator: "Travel / tour operator",
};

export const PRICING_MODELS = ["FIXED", "PER_KM", "PER_PERSON", "ON_REQUEST"] as const;
export const PRICING_MODEL_LABELS: Record<(typeof PRICING_MODELS)[number], string> = {
  FIXED: "Fixed fare",
  PER_KM: "Per kilometre",
  PER_PERSON: "Per person",
  ON_REQUEST: "On request (no published price)",
};

export const transportSchema = z
  .object({
    kind: z.enum(TRANSPORT_KINDS),
    name: localizedRequired,
    description: localizedRequired,
    images: imagesSchema,
    serviceArea: localizedOptional,
    /** Pickup point / terminal / station. */
    location: geoSchema,
    address: z.string().trim().min(1, "Address is required"),
    pricingModel: z.enum(PRICING_MODELS),
    /** Indicative only — never presented as a guaranteed fare. */
    amountInr: inrSchema.optional(),
    pricingNote: localizedOptional,
    vehicleType: z.string().trim().optional(),
    seatingCapacity: z.number().int().min(1).max(200).optional(),
    operatingHours: z.string().trim().optional(),
    /** Bus/train timetable rows. */
    departures: z
      .array(z.object({ from: z.string().trim().min(1), to: z.string().trim().min(1), time: hhmmSchema, notes: z.string().trim().optional() }))
      .default([]),
    /** PRIVATE — never rendered publicly; visitors reach the operator through an inquiry. */
    contactPhone: z.string().trim().min(6, "Enter a valid phone number"),
    availableForEvents: eventIdsSchema,
    seo: seoSchema,
  })
  .superRefine((v, ctx) => {
    if (v.pricingModel !== "ON_REQUEST" && v.amountInr === undefined) {
      ctx.addIssue({ code: "custom", path: ["amountInr"], message: "Enter an amount, or choose 'On request'" });
    }
  });

export type TransportService = CatalogRecord<z.infer<typeof transportSchema>>;

export const transportDefinition: CatalogDefinition = {
  key: "transport",
  collection: "transportServices",
  label: "Transport service",
  labelPlural: "Transport",
  icon: "🚕",
  publicPath: "/travel",
  auditPrefix: "TRANSPORT",
  imageFolder: "transport",
  schema: transportSchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: ["kind"],
  privateFields: ["contactPhone"],
  stampOnChange: [],
  dependents: [],
  defaults: {
    kind: "taxi", name: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, images: [], serviceArea: EMPTY_LOCALIZED,
    location: DEFAULT_GEO, address: "", pricingModel: "ON_REQUEST", pricingNote: EMPTY_LOCALIZED,
    departures: [], contactPhone: "", availableForEvents: [], seo: EMPTY_SEO,
  },
  fields: [
    { type: "select", name: "kind", label: "Type", options: options(TRANSPORT_KINDS, TRANSPORT_KIND_LABELS) },
    { type: "localized", name: "name", label: "Name" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "localized", name: "serviceArea", label: "Service area" },
    { type: "text", name: "address", label: "Pickup point / terminal address" },
    { type: "geo", name: "location", label: "Pickup point location" },
    { type: "select", name: "pricingModel", label: "Pricing model", options: options(PRICING_MODELS, PRICING_MODEL_LABELS) },
    { type: "number", name: "amountInr", label: "Amount (₹)", hint: "Indicative, admin-verified price. Leave empty for 'On request'." },
    { type: "localized", name: "pricingNote", label: "Pricing note", multiline: true },
    { type: "text", name: "vehicleType", label: "Vehicle type", placeholder: "e.g. Sedan, 12-seater tempo" },
    { type: "number", name: "seatingCapacity", label: "Seating capacity" },
    { type: "text", name: "operatingHours", label: "Operating hours", placeholder: "e.g. 24 hours / 5:00 AM – 11:00 PM" },
    {
      type: "list", name: "departures", label: "Timetable (buses / trains)", itemLabel: "Departure",
      fields: [
        { type: "text", name: "from", label: "From" },
        { type: "text", name: "to", label: "To" },
        { type: "time", name: "time", label: "Departure time" },
        { type: "text", name: "notes", label: "Notes" },
      ],
    },
    { type: "text", name: "contactPhone", label: "Operator phone (private — not shown publicly)" },
    eventIdsField,
    imagesField,
    seoField,
  ],
};
