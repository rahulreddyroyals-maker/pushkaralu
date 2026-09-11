import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";
import { BUSINESS_CATEGORIES } from "./types";

export const businessInputSchema = z.object({
  category: z.enum(BUSINESS_CATEGORIES),
  name: localizedTextSchema,
  description: localizedTextSchema,
  images: z.array(z.string().url()).default([]),
  address: z.string().trim().min(1, "Address is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  contactPhone: z.string().trim().min(6, "Enter a valid phone number"),
  pricingNote: localizedTextSchema,
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  canonicalPath: z.string().trim().min(1).startsWith("/"),
});

export type BusinessInput = z.infer<typeof businessInputSchema>;
