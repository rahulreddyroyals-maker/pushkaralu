import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";

export const purohitInputSchema = z.object({
  name: localizedTextSchema,
  bio: localizedTextSchema,
  photo: z.string().url().optional().or(z.literal("")),
  languages: z.array(z.string().trim().min(1)).min(1, "List at least one language"),
  experienceYears: z.coerce.number().int().min(0).max(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().trim().min(1, "Address is required"),
  contactPhone: z.string().trim().min(6, "Enter a valid phone number"),
  ritualIds: z.array(z.string()).default([]),
  pricingNote: localizedTextSchema,
  availabilityNote: localizedTextSchema,
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  canonicalPath: z.string().trim().min(1).startsWith("/"),
});

export type PurohitInput = z.infer<typeof purohitInputSchema>;
