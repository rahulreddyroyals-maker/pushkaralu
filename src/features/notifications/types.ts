import type { Role } from "@/types/roles";

export const NOTIFICATION_CATEGORIES = ["BOOKING", "EVENT_REMINDER", "EMERGENCY", "CROWD", "MARKETING"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  BOOKING: "Booking updates",
  EVENT_REMINDER: "Event reminders",
  EMERGENCY: "Emergency alerts",
  CROWD: "Crowd alerts",
  MARKETING: "Offers & promotions",
};

export const CATEGORY_HINTS: Record<NotificationCategory, string> = {
  BOOKING: "Confirmations, cancellations and changes to your bookings. Always shown in your inbox.",
  EVENT_REMINDER: "A reminder before an event you follow starts.",
  EMERGENCY: "Urgent safety alerts from the organisers. Always shown in your inbox; push is optional.",
  CROWD: "When staff report high crowd or a closed ghat you follow. These are manual staff reports, not live sensors.",
  MARKETING: "Promotions and offers. Off unless you turn them on.",
};

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type NotificationPriority = (typeof PRIORITIES)[number];

export type Audience =
  | { type: "ALL" }
  | { type: "ROLES"; roles: Role[] }
  | { type: "EVENT_FOLLOWERS"; eventId: string }
  | { type: "GHAT_FOLLOWERS"; eventId: string; ghatId: string }
  | { type: "USER"; uid: string };

export const CAMPAIGN_STATUSES = ["SCHEDULED", "SENDING", "SENT", "CANCELLED", "FAILED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type CampaignSource = "ADMIN" | "AUTO_CROWD" | "AUTO_REMINDER";

/** Counters only ever move forward. "pushSent" means FCM accepted the message — FCM does not report device delivery to the server. */
export interface DeliveryStats {
  targeted: number;
  inApp: number;
  pushAttempted: number;
  pushSent: number;
  pushFailed: number;
  noPushToken: number;
  skippedByPreference: number;
}
export const emptyStats = (): DeliveryStats => ({ targeted: 0, inApp: 0, pushAttempted: 0, pushSent: 0, pushFailed: 0, noPushToken: 0, skippedByPreference: 0 });

/** notificationCampaigns/{id} */
export interface Campaign {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  audience: Audience;
  eventId?: string;
  ghatId?: string;
  /** Always an internal path derived by the server from eventId/ghatId — never free text from the composer. */
  link: string;
  sendPush: boolean;
  source: CampaignSource;
  status: CampaignStatus;
  scheduledFor: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cursor: string | null;
  leaseUntil?: string;
  attempts: number;
  lastError?: string;
  stats: DeliveryStats;
}

export type PushStatus = "PENDING" | "SENT" | "FAILED" | "NO_TOKEN" | "OPTED_OUT" | "NOT_REQUESTED";

/** notificationInbox/{uid}/items/{id} — the user's copy; doubles as the per-recipient delivery record. */
export interface InboxItem {
  id: string;
  uid: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  campaignId?: string;
  push: PushStatus;
}

export type DevicePlatform = "web" | "android" | "ios";
export interface PushToken {
  token: string;
  platform: DevicePlatform;
  addedAt: string;
}

export interface CategoryPref {
  inApp: boolean;
  push: boolean;
}

/** notificationPrefs/{uid}. Tokens live here so one read gives preferences + devices. */
export interface NotificationPrefs {
  categories: Record<NotificationCategory, CategoryPref>;
  followedEventIds: string[];
  followedGhatIds: string[];
  tokens: PushToken[];
  updatedAt?: string;
}

/** What the client may see: never the tokens themselves. */
export interface PrefsView {
  categories: Record<NotificationCategory, CategoryPref>;
  followedEventIds: string[];
  followedGhatIds: string[];
  devices: number;
  locked: { inApp: NotificationCategory[] };
}

export interface Recipient {
  uid: string;
  prefs: NotificationPrefs;
}

export interface PushPayload {
  title: string;
  body: string;
  link: string;
  category: NotificationCategory;
  priority: NotificationPriority;
}
export interface PushResult {
  token: string;
  ok: boolean;
  /** The token is permanently dead (unregistered/invalid) and should be deleted. */
  invalid: boolean;
}
