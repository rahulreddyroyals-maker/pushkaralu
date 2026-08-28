import type { LocalizedText } from "@/types/domain";

export type { PushkaraluEvent } from "@/types/domain";

/** Event-scoped announcement — events/{eventId}/announcements/{id}. Spec Module 1. */
export interface Announcement {
  id: string;
  eventId: string;
  title: LocalizedText;
  body: LocalizedText;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
