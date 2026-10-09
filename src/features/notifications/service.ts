import { NOTIFY_LIMITS } from "@/config/app";
import { fail, forbidden, notFound, ok, unauthenticated, type Actor, type AuditSink, type ServiceResult } from "@/lib/serviceResult";
import { formatIst, formatWait, CROWD_LABELS } from "@/features/ghats/crowd";
import type { CrowdChange } from "@/features/ghats/crowdService";
import { composeSchema, deviceSchema, followSchema, markReadSchema, unregisterDeviceSchema, updatePreferencesSchema } from "./schemas";
import { canSend, canViewCampaigns, decideDelivery, normalizePrefs, toPrefsView } from "./policy";
import {
  emptyStats,
  NOTIFICATION_CATEGORIES,
  type Audience,
  type Campaign,
  type CampaignSource,
  type DeliveryStats,
  type InboxItem,
  type NotificationCategory,
  type NotificationPrefs,
  type NotificationPriority,
  type PrefsView,
  type PushPayload,
  type PushResult,
  type PushStatus,
  type PushToken,
  type Recipient,
} from "./types";

/* ───────── ports ───────── */

export interface NotificationStore {
  /** With `id`, create-if-absent (returns created:false when it already exists) — used for idempotent system campaigns. */
  createCampaign(c: Omit<Campaign, "id">, id?: string): Promise<{ id: string; created: boolean }>;
  getCampaign(id: string): Promise<Campaign | null>;
  listCampaigns(limit: number): Promise<Campaign[]>;
  countCampaignsBy(uid: string, sinceIso: string): Promise<number>;
  /** Atomically takes the campaign if it is due (SCHEDULED, scheduledFor<=now) or resumable (SENDING with an expired lease). */
  claimCampaign(id: string, nowIso: string, leaseUntilIso: string): Promise<Campaign | null>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<void>;
  listRunnableIds(nowIso: string, limit: number): Promise<string[]>;

  listAudienceBatch(audience: Audience, cursor: string | null, size: number): Promise<{ recipients: Recipient[]; nextCursor: string | null }>;
  getRecipient(uid: string): Promise<Recipient>;

  /** Writes only items that don't exist yet; returns the ids of those it created (so a retried batch can't duplicate or re-push). */
  createInboxItems(items: InboxItem[]): Promise<string[]>;
  setPushStatus(updates: { uid: string; itemId: string; status: PushStatus }[]): Promise<void>;
  listInbox(uid: string, cursor: string | null, size: number): Promise<{ items: InboxItem[]; nextCursor: string | null }>;
  countUnread(uid: string): Promise<number>;
  markRead(uid: string, ids: string[], nowIso: string): Promise<void>;
  markAllRead(uid: string, nowIso: string): Promise<void>;
  countRead(campaignId: string): Promise<number>;

  getPrefs(uid: string): Promise<NotificationPrefs | null>;
  putPrefs(uid: string, prefs: NotificationPrefs): Promise<void>;
  removeTokens(pairs: { uid: string; token: string }[]): Promise<void>;

  claimCooldown(key: string, ttlMs: number, nowIso: string): Promise<boolean>;

  eventExists(eventId: string): Promise<boolean>;
  ghatExists(eventId: string, ghatId: string): Promise<boolean>;
  listEventsStartingBetween(fromIso: string, toIso: string): Promise<{ id: string; name: string; startDate: string }[]>;
}

export interface PushSender {
  /** Sends one payload to many tokens. Must report per-token success and whether a failure means the token is dead. */
  send(payload: PushPayload, tokens: string[]): Promise<PushResult[]>;
}

export interface Deps {
  store: NotificationStore;
  push: PushSender;
  audit: AuditSink;
  now?: () => Date;
}

const nowOf = (deps: Deps) => (deps.now ?? (() => new Date()))();
const SAFE_KEY = /[^A-Za-z0-9_-]/g;

/* ───────── user: inbox ───────── */

export async function listInbox(deps: Deps, actor: Actor | null, opts: { cursor?: string | null } = {}): Promise<ServiceResult<{ items: InboxItem[]; nextCursor: string | null }>> {
  if (!actor) return unauthenticated();
  return ok(await deps.store.listInbox(actor.uid, opts.cursor ?? null, NOTIFY_LIMITS.inboxPageSize));
}

export async function unreadCount(deps: Deps, actor: Actor | null): Promise<ServiceResult<{ unread: number }>> {
  if (!actor) return unauthenticated();
  return ok({ unread: await deps.store.countUnread(actor.uid) });
}

/** Only ever touches the caller's own inbox — the uid in every store call is the session uid. */
export async function markRead(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ updated: true }>> {
  if (!actor) return unauthenticated();
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const nowIso = nowOf(deps).toISOString();
  if ("all" in parsed.data) await deps.store.markAllRead(actor.uid, nowIso);
  else await deps.store.markRead(actor.uid, parsed.data.ids, nowIso);
  return ok({ updated: true });
}

/* ───────── user: preferences, follows, devices ───────── */

async function loadPrefs(deps: Deps, uid: string): Promise<NotificationPrefs> {
  return normalizePrefs(await deps.store.getPrefs(uid));
}
async function savePrefs(deps: Deps, uid: string, prefs: NotificationPrefs) {
  await deps.store.putPrefs(uid, normalizePrefs({ ...prefs, updatedAt: nowOf(deps).toISOString() }));
}

export async function getPreferences(deps: Deps, actor: Actor | null): Promise<ServiceResult<PrefsView>> {
  if (!actor) return unauthenticated();
  return ok(toPrefsView(await loadPrefs(deps, actor.uid)));
}

export async function updatePreferences(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<PrefsView>> {
  if (!actor) return unauthenticated();
  const parsed = updatePreferencesSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const prefs = await loadPrefs(deps, actor.uid);
  for (const category of NOTIFICATION_CATEGORIES) {
    const change = parsed.data.categories[category];
    if (!change) continue;
    prefs.categories[category] = { ...prefs.categories[category], ...(change.inApp !== undefined ? { inApp: change.inApp } : {}), ...(change.push !== undefined ? { push: change.push } : {}) };
  }
  await savePrefs(deps, actor.uid, prefs); // normalize re-applies the locks
  return ok(toPrefsView(await loadPrefs(deps, actor.uid)));
}

export async function setFollow(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<PrefsView>> {
  if (!actor) return unauthenticated();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const { kind, id, value } = parsed.data;
  const prefs = await loadPrefs(deps, actor.uid);
  const key = kind === "event" ? "followedEventIds" : "followedGhatIds";
  const list = prefs[key].filter((x) => x !== id);
  if (value) {
    if (list.length >= NOTIFY_LIMITS.maxFollowsPerUser) return fail(409, `You can follow up to ${NOTIFY_LIMITS.maxFollowsPerUser} ${kind}s`);
    list.push(id);
  }
  prefs[key] = list;
  await savePrefs(deps, actor.uid, prefs);
  return ok(toPrefsView(await loadPrefs(deps, actor.uid)));
}

export async function registerDevice(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ devices: number }>> {
  if (!actor) return unauthenticated();
  const parsed = deviceSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const prefs = await loadPrefs(deps, actor.uid);
  const tokens: PushToken[] = prefs.tokens.filter((t) => t.token !== parsed.data.token);
  tokens.push({ token: parsed.data.token, platform: parsed.data.platform, addedAt: nowOf(deps).toISOString() });
  prefs.tokens = tokens.slice(-NOTIFY_LIMITS.maxTokensPerUser);
  await savePrefs(deps, actor.uid, prefs);
  return ok({ devices: prefs.tokens.length });
}

export async function unregisterDevice(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ devices: number }>> {
  if (!actor) return unauthenticated();
  const parsed = unregisterDeviceSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const prefs = await loadPrefs(deps, actor.uid);
  prefs.tokens = prefs.tokens.filter((t) => t.token !== parsed.data.token);
  await savePrefs(deps, actor.uid, prefs);
  return ok({ devices: prefs.tokens.length });
}

/* ───────── admin: composer ───────── */

function deriveLink(eventId?: string, ghatId?: string): string {
  if (eventId && ghatId) return `/events/${encodeURIComponent(eventId)}/ghats/${encodeURIComponent(ghatId)}`;
  if (eventId) return `/events/${encodeURIComponent(eventId)}`;
  return "/notifications";
}

export async function composeCampaign(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ id: string; status: Campaign["status"]; scheduledFor: string }>> {
  if (!actor) return unauthenticated();
  if (!canViewCampaigns(actor.role)) return forbidden();
  const parsed = composeSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const input = parsed.data;
  if (!canSend(actor.role, input.category)) return forbidden();

  const now = nowOf(deps);
  if ((await deps.store.countCampaignsBy(actor.uid, new Date(now.getTime() - 3_600_000).toISOString())) >= NOTIFY_LIMITS.campaignsPerActorPerHour) {
    return fail(429, "You've created many notifications in the last hour. Please wait before sending more.");
  }

  let scheduledFor = now.toISOString();
  if (input.scheduleAt) {
    const at = Date.parse(input.scheduleAt);
    if (at < now.getTime() + 30_000) return fail(400, "Schedule a time in the future, or leave it empty to send now");
    if (at > now.getTime() + NOTIFY_LIMITS.scheduleMaxDays * 86_400_000) return fail(400, `Schedule within ${NOTIFY_LIMITS.scheduleMaxDays} days`);
    scheduledFor = new Date(at).toISOString();
  }

  if (input.eventId && !(await deps.store.eventExists(input.eventId))) return fail(400, "That event doesn't exist");
  if (input.eventId && input.ghatId && !(await deps.store.ghatExists(input.eventId, input.ghatId))) return fail(400, "That location doesn't belong to the chosen event");

  let audience: Audience;
  switch (input.audience.type) {
    case "ALL":
      audience = { type: "ALL" };
      break;
    case "ROLES":
      audience = { type: "ROLES", roles: input.audience.roles };
      break;
    case "USER":
      audience = { type: "USER", uid: input.audience.uid };
      break;
    case "FOLLOWERS":
      audience = input.ghatId ? { type: "GHAT_FOLLOWERS", eventId: input.eventId!, ghatId: input.ghatId } : { type: "EVENT_FOLLOWERS", eventId: input.eventId! };
      break;
  }

  const created = await deps.store.createCampaign({
    category: input.category,
    priority: input.priority,
    title: input.title,
    message: input.message,
    audience,
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.ghatId ? { ghatId: input.ghatId } : {}),
    link: deriveLink(input.eventId, input.ghatId),
    sendPush: input.sendPush,
    source: "ADMIN",
    status: "SCHEDULED",
    scheduledFor,
    createdBy: actor.uid,
    createdByName: actor.displayName,
    createdAt: now.toISOString(),
    cursor: null,
    attempts: 0,
    stats: emptyStats(),
  });
  await deps.audit({
    actorUid: actor.uid,
    action: "NOTIFICATION_CREATED",
    targetType: "notificationCampaign",
    targetId: created.id,
    metadata: { category: input.category, priority: input.priority, audience: audience.type, scheduledFor, sendPush: input.sendPush },
  });
  return ok({ id: created.id, status: "SCHEDULED", scheduledFor }, 201);
}

export async function listCampaigns(deps: Deps, actor: Actor | null): Promise<ServiceResult<{ items: Campaign[] }>> {
  if (!actor) return unauthenticated();
  if (!canViewCampaigns(actor.role)) return forbidden();
  return ok({ items: await deps.store.listCampaigns(50) });
}

export async function getCampaignDetail(deps: Deps, actor: Actor | null, id: string): Promise<ServiceResult<{ campaign: Campaign; readCount: number }>> {
  if (!actor) return unauthenticated();
  if (!canViewCampaigns(actor.role)) return forbidden();
  const campaign = await deps.store.getCampaign(id);
  if (!campaign) return notFound();
  return ok({ campaign, readCount: await deps.store.countRead(id) });
}

export async function cancelCampaign(deps: Deps, actor: Actor | null, id: string): Promise<ServiceResult<{ status: "CANCELLED" }>> {
  if (!actor) return unauthenticated();
  if (!canViewCampaigns(actor.role)) return forbidden();
  const campaign = await deps.store.getCampaign(id);
  if (!campaign) return notFound();
  if (!canSend(actor.role, campaign.category)) return forbidden();
  if (campaign.status !== "SCHEDULED" && campaign.status !== "SENDING") return fail(409, `A ${campaign.status.toLowerCase()} notification can't be cancelled`);
  await deps.store.updateCampaign(id, { status: "CANCELLED", completedAt: nowOf(deps).toISOString() });
  await deps.audit({ actorUid: actor.uid, action: "NOTIFICATION_CANCELLED", targetType: "notificationCampaign", targetId: id, metadata: { wasStatus: campaign.status, alreadyDelivered: campaign.stats.inApp } });
  return ok({ status: "CANCELLED" });
}

/* ───────── dispatch (system) ───────── */

function payloadOf(c: Pick<Campaign, "title" | "message" | "link" | "category" | "priority">): PushPayload {
  return { title: c.title, body: c.message, link: c.link, category: c.category, priority: c.priority };
}

interface Outcome {
  stats: DeliveryStats;
}

/** Delivers one batch of already-resolved recipients. Shared by campaigns and single-user system notifications. */
async function deliverToRecipients(
  deps: Deps,
  spec: { category: NotificationCategory; priority: NotificationPriority; title: string; message: string; link: string; sendPush: boolean; campaignId?: string; itemIdFor: (uid: string) => string },
  recipients: Recipient[],
  stats: DeliveryStats
): Promise<Outcome> {
  const nowIso = nowOf(deps).toISOString();
  const items: InboxItem[] = [];
  const wantsPush = new Map<string, Recipient>();

  for (const r of recipients) {
    stats.targeted++;
    const d = decideDelivery(r.prefs, spec.category, spec.sendPush);
    if (!d.inApp) {
      stats.skippedByPreference++;
      continue;
    }
    items.push({
      id: spec.itemIdFor(r.uid),
      uid: r.uid,
      category: spec.category,
      priority: spec.priority,
      title: spec.title,
      message: spec.message,
      link: spec.link,
      read: false,
      createdAt: nowIso,
      ...(spec.campaignId ? { campaignId: spec.campaignId } : {}),
      push: d.push === "SEND" ? "PENDING" : d.push,
    });
    if (d.push === "SEND") wantsPush.set(r.uid, r);
  }

  const createdUids = new Set(await deps.store.createInboxItems(items));
  for (const item of items) {
    if (!createdUids.has(item.uid)) continue; // already delivered by an earlier attempt: no duplicate, no second push
    stats.inApp++;
    if (item.push === "NO_TOKEN") stats.noPushToken++;
  }

  // Push only for users whose inbox item was newly created.
  const tokenOwner = new Map<string, string>();
  for (const [uid, r] of wantsPush) if (createdUids.has(uid)) for (const t of r.prefs.tokens) tokenOwner.set(t.token, uid);
  if (tokenOwner.size > 0) {
    let results: PushResult[];
    try {
      results = await deps.push.send(payloadOf(spec), [...tokenOwner.keys()]);
    } catch (error) {
      console.error("[notifications] push provider failed", error);
      results = [...tokenOwner.keys()].map((token) => ({ token, ok: false, invalid: false }));
    }
    const sentBy = new Map<string, boolean>();
    const dead: { uid: string; token: string }[] = [];
    for (const res of results) {
      const uid = tokenOwner.get(res.token);
      if (!uid) continue;
      sentBy.set(uid, (sentBy.get(uid) ?? false) || res.ok);
      if (res.invalid) dead.push({ uid, token: res.token });
    }
    const updates: { uid: string; itemId: string; status: PushStatus }[] = [];
    for (const uid of wantsPush.keys()) {
      if (!createdUids.has(uid)) continue;
      const sent = sentBy.get(uid) ?? false;
      stats.pushAttempted++;
      if (sent) stats.pushSent++;
      else stats.pushFailed++;
      updates.push({ uid, itemId: spec.itemIdFor(uid), status: sent ? "SENT" : "FAILED" });
    }
    await deps.store.setPushStatus(updates);
    if (dead.length) await deps.store.removeTokens(dead); // prune tokens FCM says are gone
  }
  return { stats };
}

export interface DispatchResult {
  status: Campaign["status"] | "NOT_CLAIMED";
  batches: number;
}

/**
 * Resumable, lease-protected delivery of one campaign. Safe to call from
 * several places at once: only one caller can hold the lease, inbox ids are
 * the campaign id (so a re-run never duplicates), and the cursor + counters
 * are saved after every batch.
 */
export async function dispatchCampaign(deps: Deps, campaignId: string, opts: { maxBatches?: number } = {}): Promise<DispatchResult> {
  const maxBatches = opts.maxBatches ?? NOTIFY_LIMITS.inlineBatches;
  const now = nowOf(deps);
  const claimed = await deps.store.claimCampaign(campaignId, now.toISOString(), new Date(now.getTime() + NOTIFY_LIMITS.leaseSeconds * 1000).toISOString());
  if (!claimed) return { status: "NOT_CLAIMED", batches: 0 };

  let campaign = claimed;
  let cursor = campaign.cursor;
  const stats: DeliveryStats = { ...campaign.stats };
  let batches = 0;
  try {
    await deps.store.updateCampaign(campaignId, { status: "SENDING", startedAt: campaign.startedAt ?? now.toISOString() });
    for (;;) {
      const current = await deps.store.getCampaign(campaignId);
      if (!current || current.status === "CANCELLED") return { status: "CANCELLED", batches }; // cancelled mid-send: stop, keep counters
      campaign = current;

      const batch = await deps.store.listAudienceBatch(campaign.audience, cursor, NOTIFY_LIMITS.batchSize);
      await deliverToRecipients(
        deps,
        { category: campaign.category, priority: campaign.priority, title: campaign.title, message: campaign.message, link: campaign.link, sendPush: campaign.sendPush, campaignId, itemIdFor: () => campaignId },
        batch.recipients,
        stats
      );
      cursor = batch.nextCursor;
      batches++;
      const lease = new Date(nowOf(deps).getTime() + NOTIFY_LIMITS.leaseSeconds * 1000).toISOString();
      if (cursor === null) {
        await deps.store.updateCampaign(campaignId, { status: "SENT", cursor: null, stats: { ...stats }, completedAt: nowOf(deps).toISOString(), attempts: 0 });
        return { status: "SENT", batches };
      }
      await deps.store.updateCampaign(campaignId, { status: "SENDING", cursor, stats: { ...stats }, leaseUntil: lease });
      if (batches >= maxBatches) {
        // Hand the rest to the scheduler: release the lease so the next run can pick it up straight away.
        await deps.store.updateCampaign(campaignId, { leaseUntil: nowOf(deps).toISOString() });
        return { status: "SENDING", batches };
      }
    }
  } catch (error) {
    console.error("[notifications] dispatch failed", campaignId, error);
    const attempts = (campaign.attempts ?? 0) + 1;
    const failed = attempts >= NOTIFY_LIMITS.maxAttempts;
    await deps.store.updateCampaign(campaignId, {
      status: failed ? "FAILED" : "SENDING",
      attempts,
      lastError: "Delivery error — see server logs",
      cursor,
      stats: { ...stats },
      leaseUntil: nowOf(deps).toISOString(),
      ...(failed ? { completedAt: nowOf(deps).toISOString() } : {}),
    });
    return { status: failed ? "FAILED" : "SENDING", batches };
  }
}

/** Cron entry: resume due/stalled campaigns, then create (once) and send event reminders. */
export async function runScheduler(deps: Deps): Promise<{ dispatched: number; remindersCreated: number }> {
  const now = nowOf(deps);
  let remindersCreated = 0;

  for (const hours of NOTIFY_LIMITS.eventReminderHoursBefore) {
    const events = await deps.store.listEventsStartingBetween(now.toISOString(), new Date(now.getTime() + hours * 3_600_000).toISOString());
    for (const event of events) {
      const created = await deps.store.createCampaign(
        {
          category: "EVENT_REMINDER",
          priority: "NORMAL",
          title: `${event.name} starts soon`,
          message: `Starts ${formatIst(event.startDate)}. Open the event page for ghats, timings and safety information.`,
          audience: { type: "EVENT_FOLLOWERS", eventId: event.id },
          eventId: event.id,
          link: deriveLink(event.id),
          sendPush: true,
          source: "AUTO_REMINDER",
          status: "SCHEDULED",
          scheduledFor: now.toISOString(),
          createdBy: "system",
          createdByName: "Automatic reminder",
          createdAt: now.toISOString(),
          cursor: null,
          attempts: 0,
          stats: emptyStats(),
        },
        `reminder-${event.id.replace(SAFE_KEY, "")}-${hours}h` // one reminder per event and window, ever
      );
      if (created.created) remindersCreated++;
    }
  }

  let dispatched = 0;
  for (const id of await deps.store.listRunnableIds(now.toISOString(), 20)) {
    const r = await dispatchCampaign(deps, id, { maxBatches: 10 });
    if (r.status !== "NOT_CLAIMED") dispatched++;
  }
  return { dispatched, remindersCreated };
}

/* ───────── system notifications ───────── */

export interface UserNotification {
  uid: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  link: string;
  /** Idempotency key: the same key for the same user is delivered once, however often the trigger fires. */
  key: string;
}

/** One transactional message to one person (e.g. a booking change). Honours their preferences like everything else. */
export async function notifyUser(deps: Deps, n: UserNotification): Promise<{ delivered: boolean }> {
  const recipient = await deps.store.getRecipient(n.uid);
  const stats = emptyStats();
  const itemId = n.key.replace(SAFE_KEY, "_").slice(0, 120);
  await deliverToRecipients(
    deps,
    { category: n.category, priority: n.priority ?? "NORMAL", title: n.title, message: n.message, link: n.link, sendPush: true, itemIdFor: () => itemId },
    [recipient],
    stats
  );
  return { delivered: stats.inApp > 0 };
}

/** Crowd alert to followers of the ghat, built ONLY from what staff entered, and honestly labelled as manual. */
export async function notifyCrowdChange(deps: Deps, change: CrowdChange): Promise<{ campaignId: string | null }> {
  const now = nowOf(deps);
  const cooldownKey = `crowd-${change.ghat.id.replace(SAFE_KEY, "")}-${change.alert.key}`;
  if (!(await deps.store.claimCooldown(cooldownKey, NOTIFY_LIMITS.crowdAlertCooldownMinutes * 60_000, now.toISOString()))) return { campaignId: null };

  const when = formatIst(change.next.crowdStatusUpdatedAt);
  const wait = formatWait(change.next.waitMinutes);
  const alt = change.alternativeName ? ` Staff suggest ${change.alternativeName} instead.` : "";
  const title = change.alert.kind === "CLOSED" ? `${change.ghat.name} is closed` : `${change.ghat.name}: ${CROWD_LABELS[change.alert.level]} crowd`;
  const lead = change.alert.kind === "CLOSED" ? `Staff report ${change.ghat.name} as closed.` : `Staff report a ${CROWD_LABELS[change.alert.level].toLowerCase()} crowd at ${change.ghat.name}.`;
  const message = `${lead}${wait && change.alert.kind !== "CLOSED" ? ` ${wait}.` : ""}${alt} Reported manually at ${when}.`.slice(0, 300);

  const created = await deps.store.createCampaign({
    category: "CROWD",
    priority: change.alert.kind === "CLOSED" || (change.alert.kind === "ESCALATED" && change.alert.level === "CRITICAL") ? "HIGH" : "NORMAL",
    title: title.slice(0, 80),
    message,
    audience: { type: "GHAT_FOLLOWERS", eventId: change.eventId, ghatId: change.ghat.id },
    eventId: change.eventId,
    ghatId: change.ghat.id,
    link: deriveLink(change.eventId, change.ghat.id),
    sendPush: true,
    source: "AUTO_CROWD" as CampaignSource,
    status: "SCHEDULED",
    scheduledFor: now.toISOString(),
    createdBy: change.updatedBy,
    createdByName: "Crowd update (staff)",
    createdAt: now.toISOString(),
    cursor: null,
    attempts: 0,
    stats: emptyStats(),
  });
  await dispatchCampaign(deps, created.id);
  return { campaignId: created.id };
}

