import type { LocalizedText, GeoPoint, SeoMetadata, ApprovalStatus } from "@/types/domain";

/** purohits/{purohitId} — top-level, event-agnostic (spec Module 5). */
export interface Purohit {
  id: string;
  userId: string;
  name: LocalizedText;
  bio: LocalizedText;
  photo: string | null;
  languages: string[]; // e.g. ["Telugu", "Hindi", "English"] — free text, not an enum, since this varies too much to enumerate usefully
  experienceYears: number;
  location: GeoPoint;
  address: string;
  contactPhone: string; // same public-exposure caveat as Hotel.contactPhone — see that file's comment
  /** Ritual IDs this purohit offers — references rituals/{ritualId}, see features/rituals/types.ts */
  ritualIds: string[];
  pricingNote: LocalizedText; // free text ("₹2,000–₹5,000 depending on ritual") rather than a rigid price field, since pricing genuinely varies per ritual
  availabilityNote: LocalizedText; // free text ("Available daily 6 AM–8 PM, book 2 days ahead") — a real scheduling system is a later sprint
  approvalStatus: ApprovalStatus;
  seo: SeoMetadata;
  createdAt: string;
  updatedAt: string;
}
