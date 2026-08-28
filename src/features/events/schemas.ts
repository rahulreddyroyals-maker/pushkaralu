import { z } from "zod";

const localizedTextSchema = z.object({
  en: z.string().trim().min(1, "English text is required"),
  te: z.string().trim().min(1, "Telugu text is required"),
});

export const eventInputSchema = z
  .object({
    name: localizedTextSchema,
    river: z.enum(["GODAVARI", "KRISHNA", "TUNGABHADRA", "OTHER"]),
    year: z.coerce.number().int().min(2020).max(2100),
    startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid start date"),
    endDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid end date"),
    description: localizedTextSchema,
    status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
    featuredImage: z.string().url().optional().or(z.literal("")),
    seoTitle: localizedTextSchema,
    seoDescription: localizedTextSchema,
    canonicalPath: z.string().trim().min(1).startsWith("/"),
  })
  .refine((data) => Date.parse(data.endDate) >= Date.parse(data.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;

export const announcementInputSchema = z.object({
  title: localizedTextSchema,
  body: localizedTextSchema,
});

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

export { localizedTextSchema };
