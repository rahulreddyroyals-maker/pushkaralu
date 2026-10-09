import type { NotificationStore, PushSender } from "./service";
import { normalizePrefs } from "./policy";
import type { Audience, Campaign, InboxItem, NotificationPrefs, PushPayload, PushResult, PushStatus, Recipient } from "./types";
import type { Role } from "@/types/roles";

export interface MemoryUser {
  uid: string;
  role: Role;
}

/** In-memory adapter for tests only (no server-only import, no Firestore). Mirrors the Firestore adapter's contract. */
export function createMemoryNotificationStore() {
  const campaigns = new Map<string, Campaign>();
  const users = new Map<string, MemoryUser>();
  const prefs = new Map<string, NotificationPrefs>();
  const inbox = new Map<string, Map<string, InboxItem>>();
  const cooldowns = new Map<string, number>();
  const events = new Map<string, { id: string; name: string; startDate: string }>();
  const ghats = new Set<string>(); // `${eventId}/${ghatId}`
  let n = 0;

  const recipient = (uid: string): Recipient => ({ uid, prefs: normalizePrefs(prefs.get(uid)) });

  const store: NotificationStore = {
    async createCampaign(c, id) {
      const key = id ?? `c${++n}`;
      if (campaigns.has(key)) return { id: key, created: false };
      campaigns.set(key, { ...c, id: key });
      return { id: key, created: true };
    },
    async getCampaign(id) {
      const c = campaigns.get(id);
      return c ? structuredClone(c) : null;
    },
    async listCampaigns(limit) {
      return [...campaigns.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map((c) => structuredClone(c));
    },
    async countCampaignsBy(uid, since) {
      return [...campaigns.values()].filter((c) => c.createdBy === uid && c.createdAt >= since).length;
    },
    async claimCampaign(id, nowIso, leaseUntilIso) {
      const c = campaigns.get(id);
      if (!c) return null;
      const due = c.status === "SCHEDULED" && c.scheduledFor <= nowIso;
      const resumable = c.status === "SENDING" && (!c.leaseUntil || c.leaseUntil <= nowIso);
      if (!due && !resumable) return null;
      const next = { ...c, status: "SENDING" as const, leaseUntil: leaseUntilIso };
      campaigns.set(id, next);
      return structuredClone(next);
    },
    async updateCampaign(id, patch) {
      const c = campaigns.get(id);
      if (c) campaigns.set(id, { ...c, ...structuredClone(patch) });
    },
    async listRunnableIds(nowIso, limit) {
      return [...campaigns.values()]
        .filter((c) => (c.status === "SCHEDULED" && c.scheduledFor <= nowIso) || (c.status === "SENDING" && (!c.leaseUntil || c.leaseUntil <= nowIso)))
        .slice(0, limit)
        .map((c) => c.id);
    },
    async listAudienceBatch(audience: Audience, cursor, size) {
      let uids: string[];
      switch (audience.type) {
        case "ALL":
          uids = [...users.keys()];
          break;
        case "ROLES":
          uids = [...users.values()].filter((u) => audience.roles.includes(u.role)).map((u) => u.uid);
          break;
        case "USER":
          uids = users.has(audience.uid) ? [audience.uid] : [];
          break;
        case "EVENT_FOLLOWERS":
          uids = [...prefs.entries()].filter(([, p]) => p.followedEventIds.includes(audience.eventId)).map(([u]) => u);
          break;
        case "GHAT_FOLLOWERS":
          uids = [...prefs.entries()].filter(([, p]) => p.followedGhatIds.includes(audience.ghatId)).map(([u]) => u);
          break;
      }
      uids.sort();
      const start = cursor ? uids.findIndex((u) => u > cursor) : 0;
      const slice = start < 0 ? [] : uids.slice(start, start + size);
      const more = start >= 0 && start + size < uids.length;
      return { recipients: slice.map(recipient), nextCursor: more ? slice[slice.length - 1] : null };
    },
    async getRecipient(uid) {
      return recipient(uid);
    },
    async createInboxItems(items) {
      const created: string[] = [];
      for (const item of items) {
        const box = inbox.get(item.uid) ?? new Map();
        inbox.set(item.uid, box);
        if (box.has(item.id)) continue;
        box.set(item.id, structuredClone(item));
        created.push(item.uid);
      }
      return created;
    },
    async setPushStatus(updates) {
      for (const u of updates) {
        const item = inbox.get(u.uid)?.get(u.itemId);
        if (item) item.push = u.status as PushStatus;
      }
    },
    async listInbox(uid, cursor, size) {
      const all = [...(inbox.get(uid)?.values() ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
      const start = cursor ? all.findIndex((i) => i.id === cursor) + 1 : 0;
      const items = all.slice(start, start + size);
      return { items: structuredClone(items), nextCursor: start + size < all.length ? items[items.length - 1].id : null };
    },
    async countUnread(uid) {
      return [...(inbox.get(uid)?.values() ?? [])].filter((i) => !i.read).length;
    },
    async markRead(uid, ids, nowIso) {
      for (const id of ids) {
        const item = inbox.get(uid)?.get(id);
        if (item && !item.read) Object.assign(item, { read: true, readAt: nowIso });
      }
    },
    async markAllRead(uid, nowIso) {
      for (const item of inbox.get(uid)?.values() ?? []) if (!item.read) Object.assign(item, { read: true, readAt: nowIso });
    },
    async countRead(campaignId) {
      let count = 0;
      for (const box of inbox.values()) for (const i of box.values()) if (i.campaignId === campaignId && i.read) count++;
      return count;
    },
    async getPrefs(uid) {
      const p = prefs.get(uid);
      return p ? structuredClone(p) : null;
    },
    async putPrefs(uid, p) {
      prefs.set(uid, structuredClone(p));
    },
    async removeTokens(pairs) {
      for (const { uid, token } of pairs) {
        const p = prefs.get(uid);
        if (p) p.tokens = p.tokens.filter((t) => t.token !== token);
      }
    },
    async claimCooldown(key, ttlMs, nowIso) {
      const now = Date.parse(nowIso);
      const until = cooldowns.get(key);
      if (until !== undefined && until > now) return false;
      cooldowns.set(key, now + ttlMs);
      return true;
    },
    async eventExists(id) {
      return events.has(id);
    },
    async ghatExists(eventId, ghatId) {
      return ghats.has(`${eventId}/${ghatId}`);
    },
    async listEventsStartingBetween(from, to) {
      return [...events.values()].filter((e) => e.startDate > from && e.startDate <= to);
    },
  };

  return {
    store,
    campaigns,
    prefs,
    inbox,
    addUser: (uid: string, role: Role = "USER", p?: Partial<NotificationPrefs>) => {
      users.set(uid, { uid, role });
      if (p) prefs.set(uid, normalizePrefs(p));
    },
    addEvent: (id: string, name: string, startDate: string) => events.set(id, { id, name, startDate }),
    addGhat: (eventId: string, ghatId: string) => ghats.add(`${eventId}/${ghatId}`),
    inboxOf: (uid: string) => [...(inbox.get(uid)?.values() ?? [])],
  };
}

export type RecordingPush = PushSender & { calls: { payload: PushPayload; tokens: string[] }[]; failTokens: Set<string>; deadTokens: Set<string>; throwNext: boolean };

/** Test double for FCM: records what was sent; named tokens can be made to fail or to report "unregistered". */
export function createFakePush(): RecordingPush {
  const fake: RecordingPush = {
    calls: [],
    failTokens: new Set(),
    deadTokens: new Set(),
    throwNext: false,
    async send(payload, tokens) {
      if (fake.throwNext) {
        fake.throwNext = false;
        throw new Error("provider down");
      }
      fake.calls.push({ payload, tokens: [...tokens] });
      return tokens.map<PushResult>((token) => ({ token, ok: !fake.failTokens.has(token) && !fake.deadTokens.has(token), invalid: fake.deadTokens.has(token) }));
    },
  };
  return fake;
}
