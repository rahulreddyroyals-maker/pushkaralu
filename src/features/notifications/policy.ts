import { NOTIFY_LIMITS } from "@/config/app";
import { canModerateContent } from "@/lib/auth/guards";
import { hasAnyRole } from "@/lib/auth/guards";
import { ADMIN_ROLES, type Role } from "@/types/roles";
import { NOTIFICATION_CATEGORIES, type CategoryPref, type NotificationCategory, type NotificationPrefs, type PrefsView, type PushStatus } from "./types";

/** Categories whose inbox copy can't be switched off (transactional / safety). */
export const LOCKED_IN_APP: readonly NotificationCategory[] = ["BOOKING", "EMERGENCY"];

/**
 * Who may compose which category:
 *  - ADMIN / SUPER_ADMIN: everything composable, including promotions
 *  - MODERATOR: operational messages only (emergency, crowd, reminders)
 *  - everyone else: nothing
 * BOOKING is never composable.
 */
export function canSend(role: Role | null | undefined, category: NotificationCategory): boolean {
  if (category === "BOOKING") return false;
  if (hasAnyRole(role, ADMIN_ROLES)) return true;
  if (role === "MODERATOR") return category !== "MARKETING";
  return false;
}
export const canViewCampaigns = (role: Role | null | undefined) => canModerateContent(role);

/** Defaults: everything on except promotions, which need an explicit opt-in. */
export function defaultPrefs(): NotificationPrefs {
  const categories = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((c) => [c, c === "MARKETING" ? { inApp: false, push: false } : { inApp: true, push: true }])
  ) as Record<NotificationCategory, CategoryPref>;
  return { categories, followedEventIds: [], followedGhatIds: [], tokens: [] };
}

/** Fills gaps, enforces the locks, and guarantees push can't be on while the inbox copy is off. */
export function normalizePrefs(input?: Partial<NotificationPrefs> | null): NotificationPrefs {
  const base = defaultPrefs();
  const categories = { ...base.categories };
  for (const c of NOTIFICATION_CATEGORIES) {
    const given = input?.categories?.[c];
    const inApp = LOCKED_IN_APP.includes(c) ? true : given?.inApp ?? base.categories[c].inApp;
    const push = inApp ? given?.push ?? base.categories[c].push : false;
    categories[c] = { inApp, push };
  }
  return {
    categories,
    followedEventIds: [...new Set(input?.followedEventIds ?? [])].slice(0, NOTIFY_LIMITS.maxFollowsPerUser),
    followedGhatIds: [...new Set(input?.followedGhatIds ?? [])].slice(0, NOTIFY_LIMITS.maxFollowsPerUser),
    tokens: (input?.tokens ?? []).slice(-NOTIFY_LIMITS.maxTokensPerUser),
    ...(input?.updatedAt ? { updatedAt: input.updatedAt } : {}),
  };
}

export function toPrefsView(prefs: NotificationPrefs): PrefsView {
  return {
    categories: prefs.categories,
    followedEventIds: prefs.followedEventIds,
    followedGhatIds: prefs.followedGhatIds,
    devices: prefs.tokens.length,
    locked: { inApp: [...LOCKED_IN_APP] },
  };
}

export interface DeliveryDecision {
  inApp: boolean;
  /** SEND = attempt push; the rest are the reasons it won't happen (recorded on the inbox item and counted). */
  push: "SEND" | Exclude<PushStatus, "PENDING" | "SENT" | "FAILED">;
}

/** Preference gate for one recipient and one message. */
export function decideDelivery(prefs: NotificationPrefs, category: NotificationCategory, campaignWantsPush: boolean): DeliveryDecision {
  const pref = prefs.categories[category];
  if (!pref.inApp) return { inApp: false, push: "OPTED_OUT" };
  if (!campaignWantsPush) return { inApp: true, push: "NOT_REQUESTED" };
  if (!pref.push) return { inApp: true, push: "OPTED_OUT" };
  if (prefs.tokens.length === 0) return { inApp: true, push: "NO_TOKEN" };
  return { inApp: true, push: "SEND" };
}
