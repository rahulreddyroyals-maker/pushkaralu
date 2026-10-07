import { z } from "zod";
import { localizedTextSchema } from "@/features/events/schemas";
import type { FieldDescriptor } from "@/lib/catalog/types";

/** Required English + Telugu (same rule as every Sprint 3/4 content field). */
export const localizedRequired = localizedTextSchema;

/** Secondary copy — may be left blank in either language. */
export const localizedOptional = z
  .object({ en: z.string().trim().default(""), te: z.string().trim().default("") })
  .default({ en: "", te: "" });

export const geoSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm, e.g. 06:30");
export const inrSchema = z.number().int("Whole rupees only").min(0);

export const seoSchema = z.object({
  title: localizedRequired,
  description: localizedRequired,
  /** Left blank -> the server fills `${publicPath}/${id}`. */
  canonicalPath: z.string().trim().startsWith("/").optional().or(z.literal("")),
});

export const imagesSchema = z.array(z.string().url()).default([]);
/** Admin-entered event ids this record applies to; empty = all events (spec: providers carry availableForEvents). */
export const eventIdsSchema = z.array(z.string().trim().min(1)).default([]);

export const DEFAULT_GEO = { latitude: 16.9891, longitude: 81.7799 };
export const EMPTY_LOCALIZED = { en: "", te: "" };
export const EMPTY_SEO = { title: EMPTY_LOCALIZED, description: EMPTY_LOCALIZED, canonicalPath: "" };

export const WEEKDAY_OPTIONS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];
export const WEEKDAY_VALUES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export function options<T extends readonly string[]>(values: T, labels: Record<T[number], string>) {
  return values.map((value) => ({ value, label: labels[value as T[number]] }));
}

export const imagesField: FieldDescriptor = { type: "images", name: "images", label: "Images" };
export const seoField: FieldDescriptor = { type: "seo", name: "seo", label: "SEO" };
export const eventIdsField: FieldDescriptor = {
  type: "tags",
  name: "availableForEvents",
  label: "Available for events (event IDs)",
  placeholder: "Leave empty for all events",
};
