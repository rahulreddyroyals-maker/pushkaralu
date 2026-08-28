import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";
import { GHAT_FACILITIES } from "./types";

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

export const crowdStatusUpdateSchema = z.object({
  crowdStatus: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
});

export type CrowdStatusUpdateInput = z.infer<typeof crowdStatusUpdateSchema>;
