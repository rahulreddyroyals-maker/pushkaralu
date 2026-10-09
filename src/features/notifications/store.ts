import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { DocumentData, Query } from "firebase-admin/firestore";
import type { NotificationStore } from "./service";
import { normalizePrefs } from "./policy";
import type { Audience, Campaign, InboxItem, NotificationPrefs, PushStatus, Recipient } from "./types";

/**
 * Firestore adapter. Timestamps are ISO strings. Clients never touch these
 * collections: firestore.rules must DENY all client access to
 * notificationCampaigns, notificationInbox (and its items), notificationPrefs
 * and notificationCooldowns (docs/SPRINT_8.md) — every read and write goes
 * through the service, which enforces ownership and preferences.
 */
const db = () => getAdminDb();
const campaigns = () => db().collection("notificationCampaigns");
const inbox = (uid: string) => db().collection("notificationInbox").doc(uid).collection("items");
const prefsCol = () => db().collection("notificationPrefs");

const asCampaign = (id: string, d: DocumentData): Campaign => ({ ...(d as Omit<Campaign, "id">), id });
const asItem = (id: string, d: DocumentData): InboxItem => ({ ...(d as Omit<InboxItem, "id">), id });
const clean = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined
const chunk = <T>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function recipientsFor(uids: string[]): Promise<Recipient[]> {
  if (uids.length === 0) return [];
  const snaps = await db().getAll(...uids.map((u) => prefsCol().doc(u)));
  return snaps.map((s, i) => ({ uid: uids[i], prefs: normalizePrefs(s.exists ? (s.data() as Partial<NotificationPrefs>) : null) }));
}

export const notificationStore: NotificationStore = {
  async createCampaign(c, id) {
    if (id) {
      try {
        await campaigns().doc(id).create(clean(c));
        return { id, created: true };
      } catch (error) {
        if ((error as { code?: number }).code === 6) return { id, created: false }; // ALREADY_EXISTS
        throw error;
      }
    }
    const ref = campaigns().doc();
    await ref.set(clean(c));
    return { id: ref.id, created: true };
  },
  async getCampaign(id) {
    const s = await campaigns().doc(id).get();
    return s.exists ? asCampaign(s.id, s.data()!) : null;
  },
  async listCampaigns(limit) {
    const s = await campaigns().orderBy("createdAt", "desc").limit(limit).get();
    return s.docs.map((d) => asCampaign(d.id, d.data()));
  },
  async countCampaignsBy(uid, sinceIso) {
    const s = await campaigns().where("createdBy", "==", uid).where("createdAt", ">=", sinceIso).count().get();
    return s.data().count;
  },
  async claimCampaign(id, nowIso, leaseUntilIso) {
    return db().runTransaction(async (tx) => {
      const ref = campaigns().doc(id);
      const s = await tx.get(ref);
      if (!s.exists) return null;
      const c = asCampaign(s.id, s.data()!);
      const due = c.status === "SCHEDULED" && c.scheduledFor <= nowIso;
      const resumable = c.status === "SENDING" && (!c.leaseUntil || c.leaseUntil <= nowIso);
      if (!due && !resumable) return null;
      tx.update(ref, { status: "SENDING", leaseUntil: leaseUntilIso });
      return { ...c, status: "SENDING" as const, leaseUntil: leaseUntilIso };
    });
  },
  async updateCampaign(id, patch) {
    await campaigns().doc(id).update(clean(patch));
  },
  async listRunnableIds(nowIso, limit) {
    const [due, stalled] = await Promise.all([
      campaigns().where("status", "==", "SCHEDULED").where("scheduledFor", "<=", nowIso).limit(limit).get(),
      campaigns().where("status", "==", "SENDING").where("leaseUntil", "<=", nowIso).limit(limit).get(),
    ]);
    return [...due.docs, ...stalled.docs].map((d) => d.id).slice(0, limit);
  },

  async listAudienceBatch(audience: Audience, cursor, size) {
    if (audience.type === "USER") return { recipients: cursor ? [] : await recipientsFor([audience.uid]), nextCursor: null };

    const followers = audience.type === "EVENT_FOLLOWERS" || audience.type === "GHAT_FOLLOWERS";
    let q: Query = followers
      ? prefsCol().where(audience.type === "EVENT_FOLLOWERS" ? "followedEventIds" : "followedGhatIds", "array-contains", audience.type === "EVENT_FOLLOWERS" ? audience.eventId : audience.ghatId)
      : audience.type === "ROLES"
        ? db().collection("users").where("role", "in", audience.roles)
        : db().collection("users");
    q = q.orderBy("__name__");
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.limit(size).get();
    const nextCursor = snap.size === size ? snap.docs[snap.size - 1].id : null;
    if (followers) {
      return { recipients: snap.docs.map((d) => ({ uid: d.id, prefs: normalizePrefs(d.data() as Partial<NotificationPrefs>) })), nextCursor };
    }
    return { recipients: await recipientsFor(snap.docs.map((d) => d.id)), nextCursor };
  },
  async getRecipient(uid) {
    return (await recipientsFor([uid]))[0];
  },

  async createInboxItems(items) {
    const created: string[] = [];
    for (const part of chunk(items, 50)) {
      const results = await Promise.allSettled(part.map(({ id, uid, ...rest }) => inbox(uid).doc(id).create(clean({ ...rest, uid }))));
      results.forEach((r, i) => {
        if (r.status === "fulfilled") created.push(part[i].uid);
        else if ((r.reason as { code?: number }).code !== 6) throw r.reason; // 6 = already delivered by an earlier attempt
      });
    }
    return created;
  },
  async setPushStatus(updates) {
    for (const part of chunk(updates, 400)) {
      const batch = db().batch();
      for (const u of part) batch.update(inbox(u.uid).doc(u.itemId), { push: u.status as PushStatus });
      await batch.commit();
    }
  },
  async listInbox(uid, cursor, size) {
    let q = inbox(uid).orderBy("createdAt", "desc") as Query;
    if (cursor) {
      const after = await inbox(uid).doc(cursor).get();
      if (after.exists) q = q.startAfter(after);
    }
    const snap = await q.limit(size + 1).get();
    const docs = snap.docs.slice(0, size);
    return { items: docs.map((d) => asItem(d.id, d.data())), nextCursor: snap.size > size ? docs[docs.length - 1].id : null };
  },
  async countUnread(uid) {
    return (await inbox(uid).where("read", "==", false).count().get()).data().count;
  },
  async markRead(uid, ids, nowIso) {
    const snaps = await db().getAll(...ids.map((id) => inbox(uid).doc(id)));
    const batch = db().batch();
    for (const s of snaps) if (s.exists && s.data()!.read === false) batch.update(s.ref, { read: true, readAt: nowIso });
    await batch.commit();
  },
  async markAllRead(uid, nowIso) {
    for (;;) {
      const snap = await inbox(uid).where("read", "==", false).limit(400).get();
      if (snap.empty) return;
      const batch = db().batch();
      snap.docs.forEach((d) => batch.update(d.ref, { read: true, readAt: nowIso }));
      await batch.commit();
    }
  },
  async countRead(campaignId) {
    return (await db().collectionGroup("items").where("campaignId", "==", campaignId).where("read", "==", true).count().get()).data().count;
  },

  async getPrefs(uid) {
    const s = await prefsCol().doc(uid).get();
    return s.exists ? (s.data() as NotificationPrefs) : null;
  },
  async putPrefs(uid, prefs) {
    await prefsCol().doc(uid).set(clean(prefs));
  },
  async removeTokens(pairs) {
    const byUser = new Map<string, Set<string>>();
    for (const p of pairs) byUser.set(p.uid, (byUser.get(p.uid) ?? new Set()).add(p.token));
    for (const [uid, tokens] of byUser) {
      await db().runTransaction(async (tx) => {
        const ref = prefsCol().doc(uid);
        const s = await tx.get(ref);
        if (!s.exists) return;
        const current = s.data() as NotificationPrefs;
        tx.update(ref, { tokens: (current.tokens ?? []).filter((t) => !tokens.has(t.token)) });
      });
    }
  },

  async claimCooldown(key, ttlMs, nowIso) {
    return db().runTransaction(async (tx) => {
      const ref = db().collection("notificationCooldowns").doc(key);
      const s = await tx.get(ref);
      const now = Date.parse(nowIso);
      if (s.exists && Date.parse(s.data()!.until as string) > now) return false;
      tx.set(ref, { until: new Date(now + ttlMs).toISOString() });
      return true;
    });
  },

  async eventExists(eventId) {
    return (await db().collection("events").doc(eventId).get()).exists;
  },
  async ghatExists(eventId, ghatId) {
    return (await db().collection("events").doc(eventId).collection("ghats").doc(ghatId).get()).exists;
  },
  async listEventsStartingBetween(fromIso, toIso) {
    // Few events exist; filter in code so date-only and full ISO strings both work.
    const snap = await db().collection("events").where("published", "==", true).limit(200).get();
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    return snap.docs
      .map((d) => ({ id: d.id, name: (d.data().name?.en as string) ?? "Event", startDate: d.data().startDate as string }))
      .filter((e) => {
        const t = Date.parse(e.startDate);
        return !Number.isNaN(t) && t > from && t <= to;
      });
  },
};
