import { describe, it, expect, beforeEach } from "vitest";
import { getReport, listMine, listPublic, moderate, moderationQueue, respond, listResponses, resolveReport, submitReport, toPublicView, type Deps } from "./service";
import { createMemoryLostFoundStore } from "./memoryStore";
import type { Actor, AuditEntry } from "@/lib/serviceResult";

const user = (uid: string): Actor => ({ uid, role: "USER", displayName: `User ${uid}` });
const mod: Actor = { uid: "m1", role: "MODERATOR", displayName: "Mod" };
const admin: Actor = { uid: "a1", role: "ADMIN", displayName: "Admin" };
const editor: Actor = { uid: "e1", role: "EDITOR", displayName: "Editor" };
const alice = user("alice");
const bob = user("bob");

const NOW = new Date("2026-10-08T10:00:00Z");
const body = (over: Record<string, unknown> = {}) => ({
  category: "CHILD",
  reportType: "LOST",
  title: "Missing boy in red shirt",
  description: "Last seen near the main ghat wearing a red shirt",
  lastSeenPlace: "Main ghat",
  lastSeenAt: "2026-10-08T09:00:00Z",
  contactPhone: "+91 90000 00000",
  subjectName: "Ravi Kumar",
  subjectAge: 6,
  ...over,
});
const APPROVE = { decision: "APPROVE", publicTitle: "Child missing near main ghat", publicSummary: "A boy in a red shirt was last seen near the main ghat.", publicArea: "Main ghat" };

let store: ReturnType<typeof createMemoryLostFoundStore>;
let audits: AuditEntry[];
let deps: Deps;
beforeEach(() => {
  store = createMemoryLostFoundStore();
  audits = [];
  deps = { store, audit: async (e) => void audits.push(e), now: () => NOW };
});

async function pending(actor = alice, over = {}) {
  const r = await submitReport(deps, actor, body(over));
  if (!r.ok) throw new Error("submit failed " + JSON.stringify(r));
  return r.data.id;
}

describe("lost & found — authentication", () => {
  it("rejects unauthenticated writes and reads of private lists", async () => {
    expect((await submitReport(deps, null, body())).status).toBe(401);
    expect((await listMine(deps, null)).status).toBe(401);
    expect((await moderationQueue(deps, null)).status).toBe(401);
    expect((await moderate(deps, null, "x", APPROVE)).status).toBe(401);
    expect((await resolveReport(deps, null, "x")).status).toBe(401);
    expect((await respond(deps, null, "x", {})).status).toBe(401);
    expect((await listResponses(deps, null, "x")).status).toBe(401);
  });
});

describe("lost & found — privacy", () => {
  it("a new report is PENDING and invisible to the public, other users and anonymous callers (404)", async () => {
    const id = await pending();
    expect(store.reports.get(id)!.status).toBe("PENDING");
    for (const who of [null, bob, editor]) expect((await getReport(deps, who, id)).status).toBe(404);
    expect((await listPublic(deps, {}) as any).data.items).toHaveLength(0);
  });

  it("takes reporterId from the session, not the body, and always starts PENDING", async () => {
    const id = await pending(alice, { reporterId: "bob", status: "APPROVED", priority: false });
    const r = store.reports.get(id)!;
    expect(r.reporterId).toBe("alice");
    expect(r.status).toBe("PENDING");
    expect(r.priority).toBe(true); // child
  });

  it("owner and moderators see the full record", async () => {
    const id = await pending();
    for (const who of [alice, mod, admin]) {
      const r = await getReport(deps, who, id);
      expect(r.ok && r.data.view).toBe("full");
    }
  });

  it("the public view never contains private fields", async () => {
    const id = await pending();
    expect((await moderate(deps, mod, id, APPROVE)).ok).toBe(true);
    const r = await getReport(deps, bob, id);
    expect(r.ok && r.data.view).toBe("public");
    const json = JSON.stringify(r);
    for (const secret of ["Ravi", "90000", "red shirt wearing", "reporterId", "alice", "contactPhone", "subjectAge", "description"]) {
      expect(json.includes(secret)).toBe(false);
    }
    const list = JSON.stringify(await listPublic(deps, {}));
    expect(list.includes("Ravi")).toBe(false);
    expect(list.includes("90000")).toBe(false);
    expect(list.includes("alice")).toBe(false);
  });

  it("toPublicView returns null without moderator-written public text", () => {
    const base: any = { id: "1", status: "APPROVED", category: "PHONE", reportType: "LOST", priority: false, createdAt: "x" };
    expect(toPublicView(base)).toBeNull();
    expect(toPublicView({ ...base, status: "PENDING", publicTitle: "a", publicSummary: "b", publicArea: "c" })).toBeNull();
  });

  it("rejects personal data in public text (phone, email, link)", async () => {
    const id = await pending();
    for (const bad of [
      { publicSummary: "Call 9876543210 if you see him" },
      { publicSummary: "Email me at a@b.com about this boy" },
      { publicSummary: "See https://example.com for details" },
    ]) {
      const r = await moderate(deps, mod, id, { ...APPROVE, ...bad });
      expect(r.status).toBe(400);
    }
    expect(store.reports.get(id)!.status).toBe("PENDING");
  });

  it("a rejected report stays hidden from the public", async () => {
    const id = await pending();
    await moderate(deps, mod, id, { decision: "REJECT", reason: "Not enough detail" });
    expect((await getReport(deps, bob, id)).status).toBe(404);
  });
});

describe("lost & found — moderation authorization & state machine", () => {
  it("only moderators/admins can view the queue or moderate; EDITOR and USER get 403", async () => {
    const id = await pending();
    for (const who of [bob, editor]) {
      expect((await moderationQueue(deps, who)).status).toBe(403);
      expect((await moderate(deps, who, id, APPROVE)).status).toBe(403);
    }
    expect((await moderationQueue(deps, mod)).ok).toBe(true);
    expect((await moderationQueue(deps, admin)).ok).toBe(true);
  });

  it("queue lists urgent first, then oldest", async () => {
    const t = { n: 0 };
    deps.now = () => new Date(NOW.getTime() + ++t.n * 1000);
    const a = await pending(alice, { category: "PHONE", title: "Phone lost" });
    const b = await pending(alice, { category: "CHILD", title: "Child lost" });
    const c = await pending(alice, { category: "WALLET", title: "Wallet lost" });
    const q = await moderationQueue(deps, mod);
    expect(q.ok && q.data.items.map((x) => x.id)).toEqual([b, a, c]);
  });

  it("enforces transitions with 409s and audits each decision", async () => {
    const id = await pending();
    expect((await moderate(deps, mod, id, { decision: "TAKEDOWN", reason: "abuse" })).status).toBe(409); // not public yet
    expect((await moderate(deps, mod, id, APPROVE)).ok).toBe(true);
    expect((await moderate(deps, mod, id, APPROVE)).status).toBe(409); // already approved
    expect((await moderate(deps, mod, id, { decision: "REJECT", reason: "duplicate" })).status).toBe(409);
    expect((await moderate(deps, mod, id, { decision: "TAKEDOWN", reason: "mistaken" })).ok).toBe(true);
    expect((await getReport(deps, bob, id)).status).toBe(404); // gone from public
    expect(audits.map((a) => a.action)).toEqual(["LOST_FOUND_APPROVED", "LOST_FOUND_TAKEN_DOWN"]);
  });

  it("REJECT and TAKEDOWN require a reason", async () => {
    const id = await pending();
    expect((await moderate(deps, mod, id, { decision: "REJECT" })).status).toBe(400);
    expect((await moderate(deps, mod, id, { decision: "REJECT", reason: "" })).status).toBe(400);
  });

  it("unknown id is 404 for moderators", async () => {
    expect((await moderate(deps, mod, "nope", APPROVE)).status).toBe(404);
  });
});

describe("lost & found — submit rules", () => {
  it("rate limits to 5 per rolling 24h (429)", async () => {
    for (let i = 0; i < 5; i++) await pending();
    expect((await submitReport(deps, alice, body())).status).toBe(429);
    expect((await submitReport(deps, bob, body())).ok).toBe(true); // per-user
  });
  it("rejects a last-seen time in the future and invalid input", async () => {
    expect((await submitReport(deps, alice, body({ lastSeenAt: "2027-01-01T00:00:00Z" }))).status).toBe(400);
    expect((await submitReport(deps, alice, body({ contactPhone: "abc" }))).status).toBe(400);
    expect((await submitReport(deps, alice, body({ category: "PET" }))).status).toBe(400);
  });
});

describe("lost & found — resolve & respond", () => {
  it("only the owner or a moderator can resolve; others get 404 (not 403)", async () => {
    const id = await pending();
    expect((await resolveReport(deps, bob, id)).status).toBe(404);
    expect((await resolveReport(deps, editor, id)).status).toBe(404);
    expect((await resolveReport(deps, alice, id)).ok).toBe(true);
    expect((await resolveReport(deps, alice, id)).status).toBe(409);
  });

  it("responses only on APPROVED reports, never your own, capped at 3, and visible only to owner/moderator", async () => {
    const id = await pending();
    const msg = { message: "I think I found him", contactPhone: "9111111111" };
    expect((await respond(deps, bob, id, msg)).status).toBe(404); // pending
    await moderate(deps, mod, id, APPROVE);
    expect((await respond(deps, alice, id, msg)).status).toBe(400); // own report
    for (let i = 0; i < 3; i++) expect((await respond(deps, bob, id, msg)).ok).toBe(true);
    expect((await respond(deps, bob, id, msg)).status).toBe(429);

    expect((await listResponses(deps, bob, id)).status).toBe(404);
    expect((await listResponses(deps, editor, id)).status).toBe(404);
    const owner = await listResponses(deps, alice, id);
    expect(owner.ok && owner.data.items).toHaveLength(3);
    expect((await listResponses(deps, mod, id)).ok).toBe(true);
  });

  it("listMine returns only the caller's reports", async () => {
    await pending(alice);
    await pending(bob);
    const r = await listMine(deps, alice);
    expect(r.ok && r.data.items.every((x) => x.reporterId === "alice")).toBe(true);
  });
});
