import type { LocalizedText, SeoMetadata } from "@/types/domain";

export const RITUAL_CATEGORIES = [
  "pinda_pradanam",
  "tarpanam",
  "pitru_karma",
  "shraddha",
  "homam",
  "pooja",
  "satyanarayana_vratham",
  "other",
] as const;
export type RitualCategory = (typeof RITUAL_CATEGORIES)[number];

/**
 * rituals/{ritualId} — admin-managed catalog, top-level, event-agnostic.
 * Deliberately a fixed catalog rather than per-purohit free text, so
 * search/filtering by ritual works (spec Module 5 design note).
 */
export interface Ritual {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: RitualCategory;
  typicalDurationMinutes: number;
  indicativePriceMin: number;
  indicativePriceMax: number;
  published: boolean;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
