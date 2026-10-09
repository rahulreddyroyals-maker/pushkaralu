import { describe, it, expect, beforeEach } from "vitest";
import { crowdAlertFor, formatWait, isCrowdReported, isStale, relativeTime } from "./crowd";
import { updateCrowd, type CrowdChange, type CrowdDeps, type CrowdGhat } from "./crowdService";
import type { Actor, AuditEntry } from "@/lib/serviceResult";

const mod: Actor = { uid: "mod", role: "MODERATOR", displayName: "Mod" };
const admin: Actor = { uid: "adm", role: "ADMIN", displayName: "Admin" };
const editor: Actor = { uid: "ed", role: "EDITOR", displayName: "Ed" };
const user: Actor = { uid: "u", role: "USER", displayName: "U" };
const NOW = new Date("2026-10-10T10:00:00Z");

const ghat = (id: string, over: Partial<CrowdGhat> = {}): CrowdGhat => ({
  id, eventId: "ev1", name: { en: `Ghat ${id}` }, published: true,
  crowdStatus: "LOW", crowdStatusUpdatedAt: "2026-10-10T09:00:00Z", crowdStatusUpdatedBy: "mod", waitMinutes: null, operationalStatus: "UNKNOWN", alternativeGhatId: null, statusNote: "", ...over,
});

let ghats: Map<string, CrowdGhat>;
let patches: { id: string; patch: Record<string, unknown>; by: string }[];
let audits: AuditEntry[];
let changes: CrowdChange[];
let deps: CrowdDeps;
beforeEach(() => {
  ghats = new Map([["g1", ghat("g1")], ["g2", ghat("g2")], ["draft", ghat("draft", { published: false })]]);
  patches = [];
  audits = [];
  changes = [];
  deps = {
    store: {
      async getGhat(eventId, id) {
        const g = ghats.get(id);
        return g && eventId === "ev1" ? g : null;
      },
      async applyUpdate(_e, id, patch, by) {
        patches.push({ id, patch, by });
      },
    },
    audit: async (e) => void audits.push(e),
    onAlertWorthyChange: async (c) => void changes.push(c),
    now: () => NOW,
  };
});

describe("crowd rules (pure)", () => {
  it("formats wait times without inventing zeros", () => {
    expect(formatWait(null)).toBeNull();
    expect(formatWait(undefined)).toBeNull();
    expect(formatWait(0)).toBe("No wait reported");
    expect(formatWait(45)).toBe("About 45 min wait");
    expect(formatWait(90)).toBe("About 1 h 30 min wait");
    expect(formatWait(120)).toBe("About 2 h wait");
  });
  it("treats a ghat nobody reported on as not reported", () => {
    expect(isCrowdReported({ crowdStatusUpdatedBy: null })).toBe(false);
    expect(isCrowdReported({ crowdStatusUpdatedBy: "mod" })).toBe(true);
  });
  it("relative time and staleness", () => {
    expect(relativeTime("2026-10-10T09:58:00Z", NOW)).toBe("2 mins ago");
    expect(relativeTime("2026-10-10T10:00:00Z", NOW)).toBe("just now");
    expect(relativeTime("2026-10-10T07:00:00Z", NOW)).toBe("3 hours ago");
    expect(isStale("2026-10-10T09:00:00Z", NOW)).toBe(false);
    expect(isStale("2026-10-10T03:00:00Z", NOW)).toBe(true);
  });
  it("alerts only when crowd rises into HIGH/CRITICAL or a ghat closes", () => {
    const prev = { crowdStatus: "LOW" as const, operationalStatus: "OPEN" as const, crowdStatusUpdatedBy: "mod" };
    expect(crowdAlertFor(prev, { crowdStatus: "MODERATE", operationalStatus: "OPEN" })).toBeNull();
    expect(crowdAlertFor(prev, { crowdStatus: "HIGH", operationalStatus: "OPEN" })).toMatchObject({ kind: "ESCALATED", level: "HIGH" });
    expect(crowdAlertFor({ ...prev, crowdStatus: "HIGH" }, { crowdStatus: "HIGH", operationalStatus: "OPEN" })).toBeNull();
    expect(crowdAlertFor({ ...prev, crowdStatus: "HIGH" }, { crowdStatus: "CRITICAL", operationalStatus: "OPEN" })).toMatchObject({ level: "CRITICAL" });
    expect(crowdAlertFor({ ...prev, crowdStatus: "CRITICAL" }, { crowdStatus: "HIGH", operationalStatus: "OPEN" })).toBeNull();
    expect(crowdAlertFor(prev, { crowdStatus: "LOW", operationalStatus: "CLOSED" })).toMatchObject({ kind: "CLOSED" });
    expect(crowdAlertFor({ ...prev, operationalStatus: "CLOSED" }, { crowdStatus: "LOW", operationalStatus: "CLOSED" })).toBeNull();
  });
  it("an unreported ghat's placeholder LOW doesn't count as a previous level", () => {
    const prev = { crowdStatus: "HIGH" as const, operationalStatus: "UNKNOWN" as const, crowdStatusUpdatedBy: null };
    expect(crowdAlertFor(prev, { crowdStatus: "HIGH", operationalStatus: "OPEN" })).toMatchObject({ kind: "ESCALATED" });
  });
});

describe("updateCrowd — authorization", () => {
  it("requires login (401) and MODERATOR+ (403)", async () => {
    expect((await updateCrowd(deps, null, "ev1", "g1", { crowdStatus: "HIGH" })).status).toBe(401);
    for (const who of [user, editor]) expect((await updateCrowd(deps, who, "ev1", "g1", { crowdStatus: "HIGH" })).status).toBe(403);
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH" })).ok).toBe(true);
    expect((await updateCrowd(deps, admin, "ev1", "g1", { crowdStatus: "LOW" })).ok).toBe(true);
    expect(patches).toHaveLength(2);
  });
  it("404 for an unknown ghat or the wrong event", async () => {
    expect((await updateCrowd(deps, mod, "ev1", "nope", { crowdStatus: "LOW" })).status).toBe(404);
    expect((await updateCrowd(deps, mod, "other", "g1", { crowdStatus: "LOW" })).status).toBe(404);
  });
});

describe("updateCrowd — data", () => {
  it("accepts all four levels and rejects anything else", async () => {
    for (const level of ["LOW", "MODERATE", "HIGH", "CRITICAL"]) expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: level })).ok).toBe(true);
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "EXTREME" })).status).toBe(400);
    expect((await updateCrowd(deps, mod, "ev1", "g1", {})).status).toBe(400);
  });
  it("validates wait time, open/closed and note", async () => {
    for (const bad of [{ waitMinutes: -1 }, { waitMinutes: 721 }, { waitMinutes: 1.5 }, { waitMinutes: "10" }, { operationalStatus: "AJAR" }, { statusNote: "x".repeat(201) }]) {
      expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "LOW", ...bad })).status).toBe(400);
    }
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "LOW", waitMinutes: 0, operationalStatus: "OPEN", statusNote: "Queue moving" })).ok).toBe(true);
  });
  it("only writes the fields that were sent; null clears", async () => {
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "MODERATE" });
    expect(patches[0].patch).toEqual({ crowdStatus: "MODERATE" });
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", waitMinutes: null, alternativeGhatId: null });
    expect(patches[1].patch).toEqual({ crowdStatus: "HIGH", waitMinutes: null, alternativeGhatId: null });
  });
  it("records the reporter from the session, never the body", async () => {
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", crowdStatusUpdatedBy: "someone-else", crowdStatusUpdatedAt: "2000-01-01" } as never);
    expect(patches[0].by).toBe("mod");
    expect(patches[0].patch).not.toHaveProperty("crowdStatusUpdatedBy");
    expect(patches[0].patch).not.toHaveProperty("crowdStatusUpdatedAt");
  });
  it("alternative ghat must be another published ghat of the same event", async () => {
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", alternativeGhatId: "g1" })).status).toBe(400);
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", alternativeGhatId: "missing" })).status).toBe(400);
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", alternativeGhatId: "draft" })).status).toBe(400);
    expect((await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", alternativeGhatId: "g2" })).ok).toBe(true);
    expect(patches).toHaveLength(1);
  });
  it("audits every update with the previous level", async () => {
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH" });
    expect(audits[0]).toMatchObject({ action: "GHAT_CROWD_STATUS_UPDATED", targetId: "g1", metadata: { from: "LOW", crowdStatus: "HIGH" } });
  });
});

describe("updateCrowd — alert hook", () => {
  it("fires for escalations and closures with the alternative's name", async () => {
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "HIGH", alternativeGhatId: "g2", waitMinutes: 30 });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ ghat: { id: "g1", name: "Ghat g1" }, alert: { kind: "ESCALATED", level: "HIGH" }, alternativeName: "Ghat g2", updatedBy: "mod" });
    expect(changes[0].next.waitMinutes).toBe(30);
  });
  it("does not fire for calm updates", async () => {
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "MODERATE" });
    expect(changes).toHaveLength(0);
  });
  it("fires on closing a ghat", async () => {
    await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "LOW", operationalStatus: "CLOSED" });
    expect(changes[0].alert.kind).toBe("CLOSED");
  });
  it("a failing hook never fails or rolls back the staff update", async () => {
    deps.onAlertWorthyChange = async () => {
      throw new Error("fcm down");
    };
    const r = await updateCrowd(deps, mod, "ev1", "g1", { crowdStatus: "CRITICAL" });
    expect(r.ok).toBe(true);
    expect(patches).toHaveLength(1);
  });
});
