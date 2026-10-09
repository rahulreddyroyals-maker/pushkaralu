import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";
import { GHAT_FACILITIES, OPERATIONAL_STATUSES } from "./types";

export const ghatInputSchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema,
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  facilities: z.array(z.enum(GHAT_FACILITIES)).default([]),
  parkingInfo: localizedTextSchema,
  medicalInfo: localizedTextSchema,
  images: z.array(z.string().url()).default([]),
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  canonicalPath: z.string().trim().min(1).startsWith("/"),
});

export type GhatInput = z.infer<typeof ghatInputSchema>;

/**
 * One manual staff report. Omitted optional fields are left unchanged;
 * `null` (or "" for the note) clears them. Wait time is never defaulted.
 */
export const crowdStatusUpdateSchema = z.object({
  crowdStatus: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  waitMinutes: z.number().int().min(0).max(720).nullable().optional(),
  operationalStatus: z.enum(OPERATIONAL_STATUSES).optional(),
  alternativeGhatId: z.string().trim().min(1).max(100).nullable().optional(),
  statusNote: z.string().trim().max(200).optional(),
});

export type CrowdStatusUpdateInput = z.infer<typeof crowdStatusUpdateSchema>;
