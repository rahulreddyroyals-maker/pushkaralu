import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";

export const templeInputSchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema,
  history: localizedTextSchema,
  timings: z.string().trim().min(1, "Timings are required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().trim().min(1, "Address is required"),
  images: z.array(z.string().url()).default([]),
  nearbyAttractions: z.array(z.string().trim().min(1)).default([]),
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  canonicalPath: z.string().trim().min(1).startsWith("/"),
});

export type TempleInput = z.infer<typeof templeInputSchema>;
