import { describe, it, expect, beforeEach } from "vitest";
import * as svc from "./service";
import { createFakePush, createMemoryNotificationStore } from "./memoryStore";
import type { Actor, AuditEntry } from "@/lib/serviceResult";
import type { CrowdChange } from "@/features/ghats/crowdService";

const user = (uid: string): Actor => ({ uid, role: "USER", displayName: uid });
const alice = user("alice");
const bob = user("bob");
const mod: Actor = { uid: "mod", role: "MODERATOR", displayName: "Mod" };
const admin: Actor = { uid: "adm", role: "ADMIN", displayName: "Admin" };
const editor: Actor = { uid: "ed", role: "EDITOR", displayName: "Editor" };
const T = "x".repeat(30);

let clock: Date;
let mx: ReturnType<typeof createMemoryNotificationStore>;
let push: ReturnType<typeof createFakePush>;
let audits: AuditEntry[];
let deps: svc.Deps;
beforeEach(() => {
  clock = new Date("2026-10-10T10:00:00Z");
  mx = createMemoryNotificationStore();
  push = createFakePush();
  audits = [];
  deps = { store: mx.store, push, audit: async (e) => void audits.push(e), now: () => clock };
  mx.addEvent("ev1", "Godavari Pushkaralu", "2026-10-11T04:00:00Z");
  mx.addGhat("ev1", "g1");
  for (const u of ["alice", "bob", "carl"]) mx.addUser(u);
  mx.addUser("adm", "ADMIN");
  mx.addUser("mod", "MODERATOR");
});
const advance = (min: number) => (clock = new Date(clock.getTime() + min * 60_000));
const withToken = (uid: string, token = `${uid}-${T}`, extra: Record<string, unknown> = {}) => mx.addUser(uid, "USER", { tokens: [{ token, platform: "web", addedAt: "x" }], ...extra } as any);
const compose = (over: Record<string, unknown> = {}) => ({
  category: "MARKETING", priority: "NORMAL", title: "Festival offer", message: "Discounted boat rides this weekend", audience: { type: "ALL" }, ...over,
});

describe("notifications — authentication & isolation", () => {
  it("requires a session for every user and admin call", async () => {
    const calls = [
      svc.listInbox(deps, null), svc.unreadCount(deps, null), svc.markRead(deps, null, { all: true }), svc.getPreferences(deps, null),
      svc.updatePreferences(deps, null, {}), svc.setFollow(deps, null, {}), svc.registerDevice(deps, null, {}), svc.unregisterDevice(deps, null, {}),
      svc.composeCampaign(deps, null, {}), svc.listCampaigns(deps, null), svc.getCampaignDetail(deps, null, "x"), svc.cancelCampaign(deps, null, "x"),
    ];
    for (const r of await Promise.all(calls)) expect(r.status).toBe(401);
  });

  it("a user only ever sees and changes their own inbox", async () => {
    await svc.notifyUser(deps, { uid: "alice", category: "BOOKING", title: "Booking confirmed", message: "Your booking is confirmed", link: "/bookings", key: "b1" });
    const mine = (await svc.listInbox(deps, alice)) as any;
    const theirs = (await svc.listInbox(deps, bob)) as any;
    expect(mine.data.items).toHaveLength(1);
    expect(theirs.data.items).toHaveLength(0);
    const id = mine.data.items[0].id;
    await svc.markRead(deps, bob, { ids: [id] }); // bob tries to mark alice's item read
    expect(((await svc.unreadCount(deps, alice)) as any).data.unread).toBe(1);
    await svc.markRead(deps, alice, { ids: [id] });
    expect(((await svc.unreadCount(deps, alice)) as any).data.unread).toBe(0);
  });

  it("markRead validates its input", async () => {
    expect((await svc.markRead(deps, alice, {})).status).toBe(400);
    expect((await svc.markRead(deps, alice, { ids: [] })).status).toBe(400);
    expect((await svc.markRead(deps, alice, { all: false })).status).toBe(400);
  });
});

describe("notifications — preferences", () => {
  it("defaults: everything on except promotions", async () => {
    const p = (await svc.getPreferences(deps, alice)) as any;
    expect(p.data.categories.MARKETING).toEqual({ inApp: false, push: false });
    for (const c of ["BOOKING", "EVENT_REMINDER", "EMERGENCY", "CROWD"]) expect(p.data.categories[c]).toEqual({ inApp: true, push: true });
    expect(p.data.devices).toBe(0);
  });

  it("booking and emergency inbox copies can't be switched off, but their push can", async () => {
    const r = (await svc.updatePreferences(deps, alice, { categories: { EMERGENCY: { inApp: false, push: false }, BOOKING: { inApp: false } } })) as any;
    expect(r.data.categories.EMERGENCY).toEqual({ inApp: true, push: false });
    expect(r.data.categories.BOOKING.inApp).toBe(true);
  });

  it("push can't be on while the inbox copy is off", async () => {
    const r = (await svc.updatePreferences(deps, alice, { categories: { CROWD: { inApp: false, push: true } } })) as any;
    expect(r.data.categories.CROWD).toEqual({ inApp: false, push: false });
  });

  it("rejects unknown categories and keys", async () => {
    expect((await svc.updatePreferences(deps, alice, { categories: { SPAM: { inApp: true } } })).status).toBe(400);
    expect((await svc.updatePreferences(deps, alice, { categories: { CROWD: { admin: true } } })).status).toBe(400);
  });

  it("never exposes push tokens", async () => {
    await svc.registerDevice(deps, alice, { token: "secret-token-" + T, platform: "web" });
    const p = await svc.getPreferences(deps, alice);
    expect(JSON.stringify(p)).not.toContain("secret-token");
    expect((p as any).data.devices).toBe(1);
  });

  it("registers, de-duplicates, caps and removes devices", async () => {
    for (let i = 0; i < 7; i++) await svc.registerDevice(deps, alice, { token: `tok${i}-${T}` });
    expect(((await svc.registerDevice(deps, alice, { token: `tok6-${T}` })) as any).data.devices).toBe(5);
    expect(((await svc.unregisterDevice(deps, alice, { token: `tok6-${T}` })) as any).data.devices).toBe(4);
    expect((await svc.registerDevice(deps, alice, { token: "short" })).status).toBe(400);
  });

  it("follows events and ghats, with a cap", async () => {
    await svc.setFollow(deps, alice, { kind: "ghat", id: "g1", value: true });
    expect(((await svc.getPreferences(deps, alice)) as any).data.followedGhatIds).toEqual(["g1"]);
    await svc.setFollow(deps, alice, { kind: "ghat", id: "g1", value: false });
    expect(((await svc.getPreferences(deps, alice)) as any).data.followedGhatIds).toEqual([]);
    for (let i = 0; i < 50; i++) await svc.setFollow(deps, alice, { kind: "event", id: `e${i}`, value: true });
    expect((await svc.setFollow(deps, alice, { kind: "event", id: "extra", value: true })).status).toBe(409);
  });
});

describe("notifications — composer authorization", () => {
  it("only moderators and admins may compose; users and editors get 403", async () => {
    for (const who of [alice, editor]) {
      expect((await svc.composeCampaign(deps, who, compose())).status).toBe(403);
      expect((await svc.listCampaigns(deps, who)).status).toBe(403);
    }
    expect((await svc.listCampaigns(deps, mod)).ok).toBe(true);
  });

  it("moderators can send operational categories but not promotions; admins can send both", async () => {
    expect((await svc.composeCampaign(deps, mod, compose({ category: "MARKETING" }))).status).toBe(403);
    expect((await svc.composeCampaign(deps, mod, compose({ category: "CROWD", eventId: "ev1", audience: { type: "FOLLOWERS" } }))).status).toBe(201);
    expect((await svc.composeCampaign(deps, admin, compose())).status).toBe(201);
  });

  it("booking notifications can't be composed by hand", async () => {
    expect((await svc.composeCampaign(deps, admin, compose({ category: "BOOKING" }))).status).toBe(400);
  });

  it("emergency alerts need explicit confirmation and High/Urgent priority", async () => {
    const e = { category: "EMERGENCY", title: "Flood warning", message: "Move away from the river bank", audience: { type: "ALL" } };
    expect((await svc.composeCampaign(deps, mod, { ...e, priority: "URGENT" })).status).toBe(400);
    expect((await svc.composeCampaign(deps, mod, { ...e, priority: "NORMAL", confirmEmergency: true })).status).toBe(400);
    expect((await svc.composeCampaign(deps, mod, { ...e, priority: "URGENT", confirmEmergency: true })).status).toBe(201);
  });

  it("promotions can't be High or Urgent", async () => {
    expect((await svc.composeCampaign(deps, admin, compose({ priority: "URGENT" }))).status).toBe(400);
  });

  it("validates content, audience, event and schedule", async () => {
    expect((await svc.composeCampaign(deps, admin, compose({ title: "x" }))).status).toBe(400);
    expect((await svc.composeCampaign(deps, admin, compose({ message: "" }))).status).toBe(400);
    expect((await svc.composeCampaign(deps, admin, compose({ audience: { type: "FOLLOWERS" } }))).status).toBe(400); // needs an event
    expect((await svc.composeCampaign(deps, admin, compose({ audience: { type: "ROLES", roles: [] } }))).status).toBe(400);
    expect((await svc.composeCampaign(deps, admin, compose({ audience: { type: "ROLES", roles: ["WIZARD"] } }))).status).toBe(400);
    expect((await svc.composeCampaign(deps, admin, compose({ eventId: "nope" }))).status).toBe(400);
    expect((await svc.composeCampaign(deps, admin, compose({ eventId: "ev1", ghatId: "other" }))).status).toBe(400);
    expect((await svc.composeCampaign(deps, admin, compose({ scheduleAt: "2026-10-10T09:00:00Z" }))).status).toBe(400); // past
    expect((await svc.composeCampaign(deps, admin, compose({ scheduleAt: "2030-01-01T00:00:00Z" }))).status).toBe(400); // too far
    expect((await svc.composeCampaign(deps, admin, compose({ scheduleAt: "2026-10-11T09:00:00Z" }))).status).toBe(201);
  });

  it("derives the link from event/ghat and ignores any link in the body", async () => {
    const r = (await svc.composeCampaign(deps, admin, compose({ eventId: "ev1", ghatId: "g1", link: "https://evil.example" }))) as any;
    expect(mx.campaigns.get(r.data.id)!.link).toBe("/events/ev1/ghats/g1");
  });

  it("rate-limits campaign creation per account and audits creation", async () => {
    for (let i = 0; i < 20; i++) expect((await svc.composeCampaign(deps, admin, compose())).status).toBe(201);
    expect((await svc.composeCampaign(deps, admin, compose())).status).toBe(429);
    expect(audits.filter((a) => a.action === "NOTIFICATION_CREATED")).toHaveLength(20);
  });
});

describe("notifications — delivery, preferences and tracking", () => {
  async function sendNow(over: Record<string, unknown> = {}, who: Actor = admin) {
    const r = (await svc.composeCampaign(deps, who, compose(over))) as any;
    expect(r.ok).toBe(true);
    await svc.dispatchCampaign(deps, r.data.id);
    return r.data.id as string;
  }

  it("promotions reach only users who opted in", async () => {
    mx.addUser("alice", "USER", { categories: { MARKETING: { inApp: true, push: false } } as any });
    const id = await sendNow();
    expect(mx.inboxOf("alice")).toHaveLength(1);
    expect(mx.inboxOf("bob")).toHaveLength(0);
    const c = mx.campaigns.get(id)!;
    expect(c.status).toBe("SENT");
    expect(c.stats.inApp).toBe(1);
    expect(c.stats.skippedByPreference).toBeGreaterThanOrEqual(2);
  });

  it("emergency alerts reach everyone's inbox regardless of preferences", async () => {
    mx.addUser("bob", "USER", { categories: { EMERGENCY: { inApp: false, push: false } } as any });
    await sendNow({ category: "EMERGENCY", priority: "URGENT", confirmEmergency: true, title: "Flood warning", message: "Move away from the river bank" });
    for (const u of ["alice", "bob", "carl"]) expect(mx.inboxOf(u)).toHaveLength(1);
  });

  it("push goes only to users with a device whose push preference is on, and the outcome is recorded per user", async () => {
    withToken("alice");
    withToken("bob", undefined, { categories: { CROWD: { inApp: true, push: false } } });
    await sendNow({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat" });
    expect(push.calls).toHaveLength(1);
    expect(push.calls[0].tokens).toEqual([`alice-${T}`]);
    expect(mx.inboxOf("alice")[0].push).toBe("SENT");
    expect(mx.inboxOf("bob")[0].push).toBe("OPTED_OUT");
    expect(mx.inboxOf("carl")[0].push).toBe("NO_TOKEN");
  });

  it("in-app only campaigns send no push", async () => {
    withToken("alice");
    await sendNow({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat", sendPush: false });
    expect(push.calls).toHaveLength(0);
    expect(mx.inboxOf("alice")[0].push).toBe("NOT_REQUESTED");
  });

  it("counts push accepted vs failed and prunes dead tokens", async () => {
    withToken("alice");
    withToken("bob");
    push.failTokens.add(`alice-${T}`);
    push.deadTokens.add(`bob-${T}`);
    const id = await sendNow({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat" });
    const c = mx.campaigns.get(id)!;
    expect(c.stats.pushAttempted).toBe(2);
    expect(c.stats.pushSent).toBe(0);
    expect(c.stats.pushFailed).toBe(2);
    expect(mx.inboxOf("alice")[0].push).toBe("FAILED");
    expect(mx.prefs.get("bob")!.tokens).toHaveLength(0); // dead token removed
    expect(mx.prefs.get("alice")!.tokens).toHaveLength(1); // transient failure keeps the token
  });

  it("a push provider outage doesn't lose the in-app notification", async () => {
    withToken("alice");
    push.throwNext = true;
    const id = await sendNow({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat" });
    expect(mx.inboxOf("alice")).toHaveLength(1);
    expect(mx.campaigns.get(id)!.stats.pushFailed).toBe(1);
    expect(mx.campaigns.get(id)!.status).toBe("SENT");
  });

  it("targets roles, single users and followers correctly", async () => {
    await sendNow({ category: "EVENT_REMINDER", title: "Staff briefing", message: "Briefing at 6am", audience: { type: "ROLES", roles: ["MODERATOR"] } });
    expect(mx.inboxOf("mod")).toHaveLength(1);
    expect(mx.inboxOf("alice")).toHaveLength(0);

    mx.addUser("alice", "USER", { followedGhatIds: ["g1"], followedEventIds: ["ev1"] });
    mx.addUser("bob", "USER", { followedEventIds: ["ev1"] });
    await sendNow({ category: "CROWD", title: "Ghat note", message: "Crowd is high at ghat one", eventId: "ev1", ghatId: "g1", audience: { type: "FOLLOWERS" } });
    expect(mx.inboxOf("alice")).toHaveLength(1);
    expect(mx.inboxOf("bob")).toHaveLength(0); // follows the event, not the ghat
    await sendNow({ category: "EVENT_REMINDER", title: "Event note", message: "Gates open early tomorrow", eventId: "ev1", audience: { type: "FOLLOWERS" } });
    expect(mx.inboxOf("bob")).toHaveLength(1);

    await sendNow({ category: "EVENT_REMINDER", title: "Hello carl", message: "A message just for you", audience: { type: "USER", uid: "carl" } });
    expect(mx.inboxOf("carl")).toHaveLength(1);
  });

  it("is idempotent: dispatching twice never duplicates inbox items or pushes", async () => {
    withToken("alice");
    const id = await sendNow({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat" });
    mx.campaigns.set(id, { ...mx.campaigns.get(id)!, status: "SCHEDULED", cursor: null });
    await svc.dispatchCampaign(deps, id);
    expect(mx.inboxOf("alice")).toHaveLength(1);
    expect(push.calls).toHaveLength(1);
  });

  it("processes large audiences in batches and can be resumed", async () => {
    for (let i = 0; i < 450; i++) mx.addUser(`u${String(i).padStart(3, "0")}`, "USER", { categories: { CROWD: { inApp: true, push: false } } as any });
    const r = (await svc.composeCampaign(deps, admin, compose({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat" }))) as any;
    const first = await svc.dispatchCampaign(deps, r.data.id, { maxBatches: 1 });
    expect(first.status).toBe("SENDING");
    expect(mx.campaigns.get(r.data.id)!.stats.targeted).toBe(200);
    const second = await svc.dispatchCampaign(deps, r.data.id, { maxBatches: 10 });
    expect(second.status).toBe("SENT");
    expect(mx.campaigns.get(r.data.id)!.stats.targeted).toBe(450 + 5); // + alice/bob/carl/adm/mod
    expect(mx.inboxOf("u449")).toHaveLength(1);
  });

  it("a held lease prevents two workers delivering the same campaign", async () => {
    const r = (await svc.composeCampaign(deps, admin, compose({ category: "CROWD", title: "Crowd high", message: "Crowd is high at the main ghat" }))) as any;
    const a = await mx.store.claimCampaign(r.data.id, clock.toISOString(), new Date(clock.getTime() + 120_000).toISOString());
    expect(a).not.toBeNull();
    expect((await svc.dispatchCampaign(deps, r.data.id)).status).toBe("NOT_CLAIMED");
    advance(3); // lease expired -> resumable
    expect((await svc.dispatchCampaign(deps, r.data.id)).status).toBe("SENT");
  });

  it("scheduled campaigns wait until due", async () => {
    const r = (await svc.composeCampaign(deps, admin, compose({ category: "CROWD", title: "Later", message: "Scheduled message for later", scheduleAt: "2026-10-10T12:00:00Z" }))) as any;
    expect((await svc.dispatchCampaign(deps, r.data.id)).status).toBe("NOT_CLAIMED");
    advance(125);
    const run = await svc.runScheduler(deps);
    expect(run.dispatched).toBeGreaterThanOrEqual(1);
    expect(mx.campaigns.get(r.data.id)!.status).toBe("SENT");
  });

  it("repeated failures end in FAILED, not an endless retry", async () => {
    const r = (await svc.composeCampaign(deps, admin, compose({ category: "CROWD", title: "Boom", message: "This will fail to deliver" }))) as any;
    const original = mx.store.listAudienceBatch;
    mx.store.listAudienceBatch = async () => {
      throw new Error("db down");
    };
    for (let i = 0; i < 3; i++) {
      await svc.dispatchCampaign(deps, r.data.id);
      advance(3);
    }
    mx.store.listAudienceBatch = original;
    const c = mx.campaigns.get(r.data.id)!;
    expect(c.status).toBe("FAILED");
    expect(c.lastError).not.toContain("db down"); // internals stay in server logs
  });
});

describe("notifications — cancel, detail, tracking", () => {
  it("cancels scheduled campaigns once, audited; delivered ones can't be cancelled", async () => {
    const r = (await svc.composeCampaign(deps, admin, compose({ scheduleAt: "2026-10-11T09:00:00Z" }))) as any;
    expect((await svc.cancelCampaign(deps, alice, r.data.id)).status).toBe(403);
    expect((await svc.cancelCampaign(deps, mod, r.data.id)).status).toBe(403); // marketing is admin-only
    expect((await svc.cancelCampaign(deps, admin, r.data.id)).ok).toBe(true);
    expect((await svc.cancelCampaign(deps, admin, r.data.id)).status).toBe(409);
    expect(audits.at(-1)?.action).toBe("NOTIFICATION_CANCELLED");
    expect((await svc.cancelCampaign(deps, admin, "missing")).status).toBe(404);
    advance(2000);
    expect((await svc.dispatchCampaign(deps, r.data.id)).status).toBe("NOT_CLAIMED");
  });

  it("detail shows delivery stats and how many opened it", async () => {
    mx.addUser("alice", "USER", { categories: { MARKETING: { inApp: true, push: false } } as any });
    const r = (await svc.composeCampaign(deps, admin, compose())) as any;
    await svc.dispatchCampaign(deps, r.data.id);
    const id = mx.inboxOf("alice")[0].id;
    await svc.markRead(deps, alice, { ids: [id] });
    const d = (await svc.getCampaignDetail(deps, mod, r.data.id)) as any;
    expect(d.data.readCount).toBe(1);
    expect(d.data.campaign.stats.inApp).toBe(1);
    expect((await svc.getCampaignDetail(deps, alice, r.data.id)).status).toBe(403);
  });
});

describe("notifications — booking, reminders and crowd alerts", () => {
  it("booking notifications are idempotent per key and respect the push preference", async () => {
    withToken("alice", undefined, { categories: { BOOKING: { inApp: true, push: false } } });
    const n = { uid: "alice", category: "BOOKING" as const, title: "Booking confirmed", message: "Your booking is confirmed", link: "/bookings", key: "booking-1-CONFIRMED" };
    expect((await svc.notifyUser(deps, n)).delivered).toBe(true);
    expect((await svc.notifyUser(deps, n)).delivered).toBe(false); // same trigger again
    expect(mx.inboxOf("alice")).toHaveLength(1);
    expect(push.calls).toHaveLength(0);
    expect((await svc.notifyUser(deps, { ...n, key: "booking-1-CANCELLED" })).delivered).toBe(true);
  });

  it("sends each event reminder once, to followers only, when the event is within 24h", async () => {
    mx.addUser("alice", "USER", { followedEventIds: ["ev1"] });
    const first = await svc.runScheduler(deps);
    expect(first.remindersCreated).toBe(1);
    expect(mx.inboxOf("alice")).toHaveLength(1);
    expect(mx.inboxOf("bob")).toHaveLength(0);
    expect(mx.inboxOf("alice")[0].title).toContain("Godavari Pushkaralu");
    advance(60);
    const second = await svc.runScheduler(deps);
    expect(second.remindersCreated).toBe(0);
    expect(mx.inboxOf("alice")).toHaveLength(1);
  });

  it("doesn't remind for events further away than the window", async () => {
    mx.addEvent("far", "Later event", "2026-12-01T00:00:00Z");
    mx.addUser("alice", "USER", { followedEventIds: ["far"] });
    expect((await svc.runScheduler(deps)).remindersCreated).toBe(1); // only ev1
    expect(mx.inboxOf("alice")).toHaveLength(0);
  });

  const change = (over: Partial<CrowdChange> = {}): CrowdChange => ({
    eventId: "ev1",
    ghat: { id: "g1", name: "Main Ghat" },
    next: { crowdStatus: "HIGH", crowdStatusUpdatedAt: clock.toISOString(), crowdStatusUpdatedBy: "mod", waitMinutes: 45, operationalStatus: "OPEN" },
    alert: { kind: "ESCALATED", level: "HIGH", key: "high" },
    updatedBy: "mod",
    ...over,
  });

  it("crowd alerts go to that ghat's followers, say they are manual staff reports, and honour the cooldown", async () => {
    mx.addUser("alice", "USER", { followedGhatIds: ["g1"] });
    mx.addUser("bob", "USER", { followedGhatIds: ["other"] });
    expect((await svc.notifyCrowdChange(deps, change({ alternativeName: "North Ghat" }))).campaignId).not.toBeNull();
    const item = mx.inboxOf("alice")[0];
    expect(item.title).toBe("Main Ghat: High crowd");
    expect(item.message).toContain("Staff report");
    expect(item.message).toContain("Reported manually");
    expect(item.message).toContain("About 45 min wait");
    expect(item.message).toContain("North Ghat");
    expect(item.message.toLowerCase()).not.toContain("live");
    expect(mx.inboxOf("bob")).toHaveLength(0);
    // same level again inside the cooldown: nothing new
    expect((await svc.notifyCrowdChange(deps, change())).campaignId).toBeNull();
    expect(mx.inboxOf("alice")).toHaveLength(1);
    // a different alert type is not blocked by it
    expect((await svc.notifyCrowdChange(deps, change({ alert: { kind: "CLOSED", key: "closed" }, next: { ...change().next, operationalStatus: "CLOSED" } }))).campaignId).not.toBeNull();
    // and after the cooldown the same level can alert again
    advance(31);
    expect((await svc.notifyCrowdChange(deps, change())).campaignId).not.toBeNull();
  });

  it("crowd alerts respect a follower's crowd preference", async () => {
    mx.addUser("alice", "USER", { followedGhatIds: ["g1"], categories: { CROWD: { inApp: false, push: false } } as any });
    await svc.notifyCrowdChange(deps, change());
    expect(mx.inboxOf("alice")).toHaveLength(0);
  });
});
