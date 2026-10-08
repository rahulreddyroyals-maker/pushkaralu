import { describe, it, expect, beforeEach } from "vitest";
import * as svc from "./service";
import { createMemoryFamilyStore } from "./memoryStore";
import type { Actor, AuditEntry } from "@/lib/serviceResult";

const user = (uid: string): Actor => ({ uid, role: "USER", displayName: `User ${uid}` });
const owner = user("owner");
const mem = user("mem");
const stranger = user("stranger");
const mod: Actor = { uid: "m1", role: "MODERATOR", displayName: "Mod" };
const editor: Actor = { uid: "e1", role: "EDITOR", displayName: "Editor" };

let clock = new Date("2026-10-08T10:00:00Z");
let mx: ReturnType<typeof createMemoryFamilyStore>;
let audits: AuditEntry[];
let deps: svc.Deps;
let codeN: number;
beforeEach(() => {
  clock = new Date("2026-10-08T10:00:00Z");
  mx = createMemoryFamilyStore();
  audits = [];
  codeN = 0;
  deps = { store: mx.store, audit: async (e) => void audits.push(e), now: () => clock, newCode: () => `ABCDEFG${[2, 3, 4, 5, 6, 7, 8, 9][codeN++ % 8]}` };
});
const advance = (hours: number) => (clock = new Date(clock.getTime() + hours * 3_600_000));

async function setup() {
  const g = await svc.createGroup(deps, owner, { name: "Kumar family" });
  if (!g.ok) throw new Error("create failed");
  const inv = await svc.createInvite(deps, owner, g.data.id);
  if (!inv.ok) throw new Error("invite failed");
  const j = await svc.joinWithCode(deps, mem, { code: inv.data.code });
  if (!j.ok) throw new Error("join failed " + JSON.stringify(j));
  return { id: g.data.id, code: inv.data.code };
}
const SHARE = { enabled: true, consent: true, durationHours: 2 };
const LOC = { latitude: 17.0, longitude: 81.8, accuracyMeters: 10 };

describe("family — authentication", () => {
  it("every operation requires a session", async () => {
    const { id } = await setup();
    const calls = [
      svc.createGroup(deps, null, { name: "x" }),
      svc.listMyGroups(deps, null),
      svc.getGroupView(deps, null, id),
      svc.deleteGroup(deps, null, id),
      svc.createInvite(deps, null, id),
      svc.joinWithCode(deps, null, {}),
      svc.leaveGroup(deps, null, id),
      svc.removeMember(deps, null, id, "x"),
      svc.updateMyProfile(deps, null, id, {}),
      svc.setSharing(deps, null, id, SHARE),
      svc.updateMyLocation(deps, null, id, LOC),
      svc.setMeetingPoint(deps, null, id, {}),
      svc.clearMeetingPoint(deps, null, id),
      svc.sendAlert(deps, null, id, {}),
      svc.resolveAlert(deps, null, id, "a"),
      svc.listEscalatedAlerts(deps, null),
      svc.acknowledgeEscalatedAlert(deps, null, "a"),
    ];
    for (const r of await Promise.all(calls)) expect(r.status).toBe(401);
  });
});

describe("family — non-members learn nothing (404)", () => {
  it("returns 404 for every group operation, same as a group that doesn't exist", async () => {
    const { id } = await setup();
    for (const who of [stranger, mod, editor]) {
      const results = await Promise.all([
        svc.getGroupView(deps, who, id),
        svc.deleteGroup(deps, who, id),
        svc.createInvite(deps, who, id),
        svc.leaveGroup(deps, who, id),
        svc.removeMember(deps, who, id, "mem"),
        svc.updateMyProfile(deps, who, id, { emergencyContact: null }),
        svc.setSharing(deps, who, id, SHARE),
        svc.updateMyLocation(deps, who, id, LOC),
        svc.setMeetingPoint(deps, who, id, { name: "Gate", latitude: 1, longitude: 1 }),
        svc.clearMeetingPoint(deps, who, id),
        svc.sendAlert(deps, who, id, { message: "hi" }),
      ]);
      for (const r of results) expect(r.status).toBe(404);
    }
    const ghost = await svc.getGroupView(deps, stranger, "does-not-exist");
    const real = await svc.getGroupView(deps, stranger, id);
    expect(real).toEqual(ghost);
  });

  it("a moderator who is not a member cannot see a group, its roster or locations", async () => {
    const { id } = await setup();
    expect((await svc.getGroupView(deps, mod, id)).status).toBe(404);
    expect((await svc.listMyGroups(deps, mod)) as any).toMatchObject({ ok: true, data: { items: [] } });
  });

  it("listMyGroups shows only my groups", async () => {
    await setup();
    const r = await svc.listMyGroups(deps, stranger);
    expect(r.ok && r.data.items).toHaveLength(0);
    const m = await svc.listMyGroups(deps, mem);
    expect(m.ok && m.data.items).toHaveLength(1);
  });
});

describe("family — location sharing is opt-in", () => {
  it("is OFF by default for the owner and for joiners, and no location is stored", async () => {
    const { id } = await setup();
    const v = await svc.getGroupView(deps, owner, id);
    expect(v.ok && v.data.members.every((m) => !m.sharingActive && !m.location)).toBe(true);
    expect((await svc.updateMyLocation(deps, mem, id, LOC)).status).toBe(403);
  });

  it("enabling needs explicit consent:true and a duration of at most 24h", async () => {
    const { id } = await setup();
    for (const bad of [
      { enabled: true, durationHours: 2 },
      { enabled: true, consent: false, durationHours: 2 },
      { enabled: true, consent: "yes", durationHours: 2 },
      { enabled: true, consent: true },
      { enabled: true, consent: true, durationHours: 25 },
      { enabled: true, consent: true, durationHours: 0 },
      { enabled: true, consent: true, durationHours: -1 },
    ]) {
      expect((await svc.setSharing(deps, mem, id, bad)).status).toBe(400);
    }
    const m = (await svc.getGroupView(deps, mem, id)) as any;
    expect(m.data.me.sharingActive).toBe(false);
  });

  it("others see my location only while I am sharing", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, mem, id, SHARE);
    await svc.updateMyLocation(deps, mem, id, LOC);
    let v = (await svc.getGroupView(deps, owner, id)) as any;
    expect(v.data.members.find((m: any) => m.uid === "mem").location.latitude).toBe(17.0);
    // owner's own sharing is separate: owner never opted in
    expect(v.data.members.find((m: any) => m.uid === "owner").location).toBeUndefined();

    advance(3); // window (2h) over
    v = await svc.getGroupView(deps, owner, id);
    const row = v.data.members.find((m: any) => m.uid === "mem");
    expect(row.sharingActive).toBe(false);
    expect(row.location).toBeUndefined();
    expect(JSON.stringify(v)).not.toContain("17");
  });

  it("an expired window rejects updates and erases the stored fix", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, mem, id, SHARE);
    await svc.updateMyLocation(deps, mem, id, LOC);
    advance(3);
    expect((await svc.updateMyLocation(deps, mem, id, LOC)).status).toBe(403);
    const stored = await mx.store.getMember(id, "mem");
    expect(stored?.lastLocation).toBeUndefined();
    expect(stored?.sharing.enabled).toBe(false);
  });

  it("turning sharing off erases the stored fix", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, mem, id, SHARE);
    await svc.updateMyLocation(deps, mem, id, LOC);
    await svc.setSharing(deps, mem, id, { enabled: false });
    expect((await mx.store.getMember(id, "mem"))?.lastLocation).toBeUndefined();
  });

  it("a member can only ever write their own location (body uid is ignored)", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, owner, id, SHARE);
    // mem has NOT opted in; try to write using owner's uid in the body
    const r = await svc.updateMyLocation(deps, mem, id, { ...LOC, uid: "owner" });
    expect(r.status).toBe(403);
    expect((await mx.store.getMember(id, "owner"))?.lastLocation).toBeUndefined();
    expect((await mx.store.getMember(id, "mem"))?.lastLocation).toBeUndefined();
  });

  it("rejects out-of-range coordinates", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, mem, id, SHARE);
    expect((await svc.updateMyLocation(deps, mem, id, { latitude: 91, longitude: 0 })).status).toBe(400);
  });

  it("leaving or being removed erases the member's data", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, mem, id, SHARE);
    await svc.updateMyLocation(deps, mem, id, LOC);
    expect((await svc.leaveGroup(deps, mem, id)).ok).toBe(true);
    expect(await mx.store.getMember(id, "mem")).toBeNull();
    expect((await svc.getGroupView(deps, mem, id)).status).toBe(404);
  });
});

describe("family — roles, invites & membership", () => {
  it("only the owner can invite, remove members or delete the group", async () => {
    const { id } = await setup();
    expect((await svc.createInvite(deps, mem, id)).status).toBe(403);
    expect((await svc.removeMember(deps, mem, id, "owner")).status).toBe(403);
    expect((await svc.deleteGroup(deps, mem, id)).status).toBe(403);
    expect((await svc.removeMember(deps, owner, id, "mem")).ok).toBe(true);
    expect((await svc.getGroupView(deps, mem, id)).status).toBe(404); // removed member is out
    expect((await svc.deleteGroup(deps, owner, id)).ok).toBe(true);
  });

  it("the owner cannot leave or remove themselves", async () => {
    const { id } = await setup();
    expect((await svc.leaveGroup(deps, owner, id)).status).toBe(409);
    expect((await svc.removeMember(deps, owner, id, "owner")).status).toBe(400);
  });

  it("deleting a group cascades (members, invites, alerts)", async () => {
    const { id } = await setup();
    await svc.sendAlert(deps, mem, id, { message: "help" });
    await svc.deleteGroup(deps, owner, id);
    expect(mx.groups.size + mx.members.size + mx.invites.size + mx.alerts.size).toBe(0);
  });

  it("invalid, malformed and expired codes all give an identical error", async () => {
    const { code } = await setup();
    const a = await svc.joinWithCode(deps, stranger, { code: "ZZZZZZZZ" });
    expect(a.status).toBe(404);
    advance(49);
    const b = await svc.joinWithCode(deps, stranger, { code });
    expect(b).toEqual(a);
    expect((await svc.joinWithCode(deps, stranger, { code: "short" })).status).toBe(400);
  });

  it("joining is idempotent, starts with sharing off, and the group is capped at 15", async () => {
    const { id, code } = await setup();
    expect((await svc.joinWithCode(deps, mem, { code })).status).toBe(200);
    expect((await mx.store.getMember(id, "mem"))?.sharing.enabled).toBe(false);
    for (let i = 0; i < 13; i++) {
      expect((await svc.joinWithCode(deps, user(`u${i}`), { code })).ok).toBe(true);
    }
    expect((await svc.joinWithCode(deps, user("late"), { code })).status).toBe(409);
  });

  it("owners may own at most 5 groups", async () => {
    for (let i = 0; i < 5; i++) expect((await svc.createGroup(deps, owner, { name: `G${i}` })).ok).toBe(true);
    expect((await svc.createGroup(deps, owner, { name: "G6" })).status).toBe(429);
  });

  it("emergency contact is visible to group members only and editable only by its owner", async () => {
    const { id } = await setup();
    await svc.updateMyProfile(deps, mem, id, { emergencyContact: { name: "Dad", phone: "9876501234" } });
    const v = (await svc.getGroupView(deps, owner, id)) as any;
    expect(v.data.members.find((m: any) => m.uid === "mem").emergencyContact.name).toBe("Dad");
    expect((await svc.updateMyProfile(deps, mem, id, { emergencyContact: { name: "x", phone: "no" } })).status).toBe(400);
    await svc.updateMyProfile(deps, mem, id, { emergencyContact: null });
    expect((await mx.store.getMember(id, "mem"))?.emergencyContact).toBeUndefined();
    // owner's contact untouched by mem's edits
    await svc.updateMyProfile(deps, owner, id, { emergencyContact: { name: "Mom", phone: "9876505555" } });
    await svc.updateMyProfile(deps, mem, id, { emergencyContact: null });
    expect((await mx.store.getMember(id, "owner"))?.emergencyContact?.name).toBe("Mom");
  });
});

describe("family — meeting point", () => {
  it("members can set and clear it; non-members cannot", async () => {
    const { id } = await setup();
    expect((await svc.setMeetingPoint(deps, mem, id, { name: "Gate 2", latitude: 17, longitude: 81 })).ok).toBe(true);
    const v = (await svc.getGroupView(deps, owner, id)) as any;
    expect(v.data.group.meetingPoint.name).toBe("Gate 2");
    expect((await svc.setMeetingPoint(deps, mem, id, { name: "x", latitude: 17, longitude: 81 })).status).toBe(400);
    expect((await svc.clearMeetingPoint(deps, mem, id)).ok).toBe(true);
    expect(((await svc.getGroupView(deps, owner, id)) as any).data.group.meetingPoint).toBeUndefined();
  });
});

describe("family — alerts & escalation", () => {
  it("attaches location only when explicitly included, independent of sharing", async () => {
    const { id } = await setup();
    await svc.sendAlert(deps, mem, id, { message: "no loc", latitude: 17, longitude: 81 }); // coords without includeLocation
    await svc.sendAlert(deps, mem, id, { message: "with loc", includeLocation: true, latitude: 17, longitude: 81 });
    const alerts = [...mx.alerts.values()];
    expect(alerts[0].location).toBeUndefined();
    expect(alerts[1].location).toEqual({ latitude: 17, longitude: 81 });
    expect((await svc.sendAlert(deps, mem, id, { includeLocation: true })).status).toBe(400);
  });

  it("escalation needs a callback phone; the phone is stored only when escalating", async () => {
    const { id } = await setup();
    expect((await svc.sendAlert(deps, mem, id, { escalate: true })).status).toBe(400);
    await svc.sendAlert(deps, mem, id, { message: "private", callbackPhone: "9000000001" });
    expect([...mx.alerts.values()][0].callbackPhone).toBeUndefined();
    expect((await svc.sendAlert(deps, mem, id, { message: "help", escalate: true, callbackPhone: "9000000001" })).ok).toBe(true);
  });

  it("is rate-limited to 5 per hour per sender and uses the session identity", async () => {
    const { id } = await setup();
    for (let i = 0; i < 5; i++) expect((await svc.sendAlert(deps, mem, id, { message: `a${i}`, senderId: "owner" })).ok).toBe(true);
    expect((await svc.sendAlert(deps, mem, id, { message: "again" })).status).toBe(429);
    expect([...mx.alerts.values()].every((a) => a.senderId === "mem")).toBe(true);
    advance(1.1);
    expect((await svc.sendAlert(deps, mem, id, { message: "later" })).ok).toBe(true);
  });

  it("group members never see callback phones or staff acknowledgement data", async () => {
    const { id } = await setup();
    await svc.sendAlert(deps, mem, id, { message: "help", escalate: true, callbackPhone: "9000000001" });
    const v = (await svc.getGroupView(deps, owner, id)) as any;
    expect(v.data.activeAlerts).toHaveLength(1);
    expect(JSON.stringify(v)).not.toContain("9000000001");
  });

  it("only the sender or the owner can resolve an alert; alerts from other groups are 404", async () => {
    const { id } = await setup();
    const other = await svc.createGroup(deps, stranger, { name: "Other" });
    const a = (await svc.sendAlert(deps, mem, id, { message: "help" })) as any;
    const third = user("third");
    const inv = (await svc.createInvite(deps, owner, id)) as any;
    await svc.joinWithCode(deps, third, { code: inv.data.code });
    expect((await svc.resolveAlert(deps, third, id, a.data.id)).status).toBe(403);
    expect((await svc.resolveAlert(deps, stranger, (other as any).data.id, a.data.id)).status).toBe(404);
    expect((await svc.resolveAlert(deps, owner, id, a.data.id)).ok).toBe(true);
    expect(((await svc.getGroupView(deps, mem, id)) as any).data.activeAlerts).toHaveLength(0);
  });

  it("staff see only escalated alerts, with no roster or locations; ordinary users and editors are refused", async () => {
    const { id } = await setup();
    await svc.setSharing(deps, mem, id, SHARE);
    await svc.updateMyLocation(deps, mem, id, LOC);
    await svc.sendAlert(deps, mem, id, { message: "private one" });
    await svc.sendAlert(deps, mem, id, { message: "tell staff", escalate: true, callbackPhone: "9000000001" });

    expect((await svc.listEscalatedAlerts(deps, stranger)).status).toBe(403);
    expect((await svc.listEscalatedAlerts(deps, editor)).status).toBe(403);
    const r = (await svc.listEscalatedAlerts(deps, mod)) as any;
    expect(r.data.items).toHaveLength(1);
    expect(r.data.items[0].message).toBe("tell staff");
    expect(r.data.items[0].callbackPhone).toBe("9000000001");
    const json = JSON.stringify(r);
    for (const leak of ["private one", "memberIds", "owner", "17", "lastLocation", "senderId", "groupId"]) expect(json).not.toContain(leak);
  });

  it("acknowledge works only for staff and only on escalated alerts, and is audited", async () => {
    const { id } = await setup();
    const priv = (await svc.sendAlert(deps, mem, id, { message: "private" })) as any;
    const esc = (await svc.sendAlert(deps, mem, id, { message: "staff", escalate: true, callbackPhone: "9000000001" })) as any;
    expect((await svc.acknowledgeEscalatedAlert(deps, stranger, esc.data.id)).status).toBe(403);
    expect((await svc.acknowledgeEscalatedAlert(deps, mod, priv.data.id)).status).toBe(404);
    expect((await svc.acknowledgeEscalatedAlert(deps, mod, esc.data.id)).ok).toBe(true);
    expect(audits.at(-1)?.action).toBe("FAMILY_ALERT_ACKNOWLEDGED");
    expect(((await svc.listEscalatedAlerts(deps, mod)) as any).data.items[0].acknowledgedBy).toBe("m1");
  });
});
