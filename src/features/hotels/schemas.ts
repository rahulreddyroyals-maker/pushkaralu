import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";
import { HOTEL_AMENITIES } from "./types";

export const hotelInputSchema = z
  .object({
    name: localizedTextSchema,
    description: localizedTextSchema,
    images: z.array(z.string().url()).default([]),
    address: z.string().trim().min(1, "Address is required"),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    contactPhone: z.string().trim().min(6, "Enter a valid phone number"),
    amenities: z.array(z.enum(HOTEL_AMENITIES)).default([]),
    priceRangeMin: z.coerce.number().min(0),
    priceRangeMax: z.coerce.number().min(0),
    policies: localizedTextSchema,
    seoTitle: localizedTextSchema,
    seoDescription: localizedTextSchema,
    canonicalPath: z.string().trim().min(1).startsWith("/"),
  })
  .refine((data) => data.priceRangeMax >= data.priceRangeMin, {
    message: "Maximum price must be at or above the minimum",
    path: ["priceRangeMax"],
  });

export type HotelInput = z.infer<typeof hotelInputSchema>;
