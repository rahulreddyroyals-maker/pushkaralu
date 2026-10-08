export const LOST_FOUND_CATEGORIES = ["PERSON", "CHILD", "PHONE", "WALLET", "DOCUMENT", "LUGGAGE"] as const;
export type LostFoundCategory = (typeof LOST_FOUND_CATEGORIES)[number];

export const LOST_FOUND_CATEGORY_LABELS: Record<LostFoundCategory, string> = {
  PERSON: "Person",
  CHILD: "Child",
  PHONE: "Phone",
  WALLET: "Wallet",
  DOCUMENT: "Document",
  LUGGAGE: "Luggage",
};

export const REPORT_TYPES = ["LOST", "FOUND"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "RESOLVED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** People are urgent: moderators see them first. */
export const URGENT_CATEGORIES: readonly LostFoundCategory[] = ["CHILD", "PERSON"];

/**
 * lostFoundReports/{id}. EVERYTHING here is private to the reporter and
 * moderators except what `toPublicView` explicitly copies. The public fields
 * (publicTitle/Summary/Area) are written by a moderator at approval — the
 * reporter's own words are never published directly.
 */
export interface LostFoundReport {
  id: string;
  reporterId: string;
  reporterName: string;
  category: LostFoundCategory;
  reportType: ReportType;
  title: string;
  description: string;
  lastSeenPlace: string;
  lastSeenAt: string; // ISO
  contactPhone: string; // PRIVATE
  subjectName?: string; // PRIVATE (person/child)
  subjectAge?: number; // PRIVATE
  status: ReportStatus;
  priority: boolean;
  publicTitle?: string;
  publicSummary?: string;
  publicArea?: string;
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** The ONLY shape ever sent to someone who is not the reporter or a moderator. */
export interface PublicLostFoundReport {
  id: string;
  category: LostFoundCategory;
  reportType: ReportType;
  title: string;
  summary: string;
  area: string;
  status: Extract<ReportStatus, "APPROVED" | "RESOLVED">;
  priority: boolean;
  postedAt: string;
}

/** lostFoundResponses/{id} — "I may have found this" messages. Visible only to the reporter and moderators. */
export interface LostFoundResponse {
  id: string;
  reportId: string;
  responderId: string;
  responderName: string;
  message: string;
  contactPhone: string;
  createdAt: string;
}
