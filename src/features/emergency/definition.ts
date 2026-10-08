import { z } from "zod";
import type { CatalogDefinition, CatalogRecord } from "@/lib/catalog/types";
import { geoSchema, options } from "@/features/catalog/common";
import { PHONE_PATTERN } from "@/lib/safety/phone";

export const EMERGENCY_KINDS = ["POLICE", "AMBULANCE", "FIRE", "HOSPITAL", "PHARMACY", "FIRST_AID"] as const;
export type EmergencyKind = (typeof EMERGENCY_KINDS)[number];

export const EMERGENCY_KIND_LABELS: Record<EmergencyKind, string> = {
  POLICE: "Police",
  AMBULANCE: "Ambulance",
  FIRE: "Fire",
  HOSPITAL: "Hospitals",
  PHARMACY: "Pharmacies",
  FIRST_AID: "First-aid centres",
};

export const EMERGENCY_KIND_ICONS: Record<EmergencyKind, string> = {
  POLICE: "🚓",
  AMBULANCE: "🚑",
  FIRE: "🚒",
  HOSPITAL: "🏥",
  PHARMACY: "💊",
  FIRST_AID: "⛑️",
};

/** Kinds that are physical places a person can travel to — they must have coordinates so "navigate" is real, not guessed. */
export const FACILITY_KINDS: readonly EmergencyKind[] = ["HOSPITAL", "PHARMACY", "FIRST_AID"];

const phoneSchema = z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number (digits, optional +)");

const today = () => new Date().toISOString().slice(0, 10);

export const emergencySchema = z
  .object({
    kind: z.enum(EMERGENCY_KINDS),
    name: z.object({ en: z.string().trim().min(1, "English name is required"), te: z.string().trim().default("") }),
    description: z.object({ en: z.string().trim().default(""), te: z.string().trim().default("") }).default({ en: "", te: "" }),
    phone: phoneSchema,
    alternatePhone: phoneSchema.optional(),
    address: z.string().trim().optional(),
    location: geoSchema.optional(),
    open24x7: z.boolean().default(false),
    openingHours: z.string().trim().optional(),
    services: z.array(z.string().trim().min(1)).default([]),
    /**
     * Verification is mandatory, not decorative: nothing enters this directory
     * without a date and a source (spec: "Emergency data must be admin-managed
     * and verified. Do not fabricate emergency numbers.").
     */
    verifiedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date you verified this (YYYY-MM-DD)")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .refine((v) => v <= today(), "Verification date can't be in the future"),
    verificationSource: z.string().trim().min(3, "Say how this was verified (e.g. 'Called the control room on <date>')"),
  })
  .superRefine((v, ctx) => {
    if (FACILITY_KINDS.includes(v.kind)) {
      if (!v.location) ctx.addIssue({ code: "custom", path: ["location"], message: "Facilities need a location so navigation is accurate" });
      if (!v.address) ctx.addIssue({ code: "custom", path: ["address"], message: "Facilities need an address" });
    }
  });

export type EmergencyService = CatalogRecord<z.infer<typeof emergencySchema>>;

export const emergencyDefinition: CatalogDefinition = {
  key: "emergency-services",
  collection: "emergencyServices",
  label: "Emergency service",
  labelPlural: "Emergency services",
  icon: "🚑",
  publicPath: "/emergency",
  auditPrefix: "EMERGENCY_SERVICE",
  imageFolder: "emergency",
  schema: emergencySchema as unknown as CatalogDefinition["schema"],
  titleField: "name",
  filterKeys: ["kind"],
  privateFields: [],
  stampOnChange: [],
  dependents: [],
  defaults: {
    kind: "HOSPITAL",
    name: { en: "", te: "" },
    description: { en: "", te: "" },
    phone: "",
    open24x7: false,
    services: [],
    verifiedOn: "",
    verificationSource: "",
  },
  fields: [
    { type: "select", name: "kind", label: "Type", options: options(EMERGENCY_KINDS, EMERGENCY_KIND_LABELS) },
    { type: "localized", name: "name", label: "Name (Telugu optional)" },
    { type: "localized", name: "description", label: "Description", multiline: true },
    { type: "text", name: "phone", label: "Phone (as verified — do not guess)" },
    { type: "text", name: "alternatePhone", label: "Alternate phone" },
    { type: "text", name: "address", label: "Address (required for hospitals, pharmacies, first-aid)" },
    { type: "geo", name: "location", label: "Location (required for facilities)", optional: true },
    { type: "boolean", name: "open24x7", label: "Open 24 hours" },
    { type: "text", name: "openingHours", label: "Opening hours (if not 24 hours)" },
    { type: "tags", name: "services", label: "Services", placeholder: "e.g. Trauma care, Blood bank" },
    { type: "date", name: "verifiedOn", label: "Verified on" },
    { type: "text", name: "verificationSource", label: "Verification source", hint: "Required. How and by whom this was confirmed." },
  ],
};
