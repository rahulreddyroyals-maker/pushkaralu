import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";
import { RITUAL_CATEGORIES } from "./types";

export const ritualInputSchema = z
  .object({
    name: localizedTextSchema,
    description: localizedTextSchema,
    category: z.enum(RITUAL_CATEGORIES),
    typicalDurationMinutes: z.coerce.number().int().min(1),
    indicativePriceMin: z.coerce.number().min(0),
    indicativePriceMax: z.coerce.number().min(0),
    seoTitle: localizedTextSchema,
    seoDescription: localizedTextSchema,
    canonicalPath: z.string().trim().min(1).startsWith("/"),
  })
  .refine((data) => data.indicativePriceMax >= data.indicativePriceMin, {
    message: "Maximum price must be at or above the minimum",
    path: ["indicativePriceMax"],
  });

export type RitualInput = z.infer<typeof ritualInputSchema>;
