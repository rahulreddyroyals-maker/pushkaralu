import type { FamilyStore } from "./service";
import type { FamilyAlert, FamilyGroup, FamilyInvite, FamilyMember } from "./types";

/** In-memory adapter for tests only. Mirrors the Firestore adapter's contract (putMember keeps memberIds in sync; deleteGroup cascades). */
export function createMemoryFamilyStore() {
  const groups = new Map<string, FamilyGroup>();
  const members = new Map<string, Map<string, FamilyMember>>();
  const invites = new Map<string, FamilyInvite>();
  const alerts = new Map<string, FamilyAlert>();
  let n = 0;
  const store: FamilyStore = {
    async createGroup(g, owner) {
      const id = `g${++n}`;
      groups.set(id, { ...g, id });
      members.set(id, new Map([[owner.uid, owner]]));
      return id;
    },
    async getGroup(id) {
      const g = groups.get(id);
      return g ? { ...g, memberIds: [...g.memberIds] } : null;
    },
    async setMeetingPoint(id, point, nowIso) {
      const g = groups.get(id);
      if (!g) return;
      const { meetingPoint: _m, ...rest } = g;
      void _m;
      groups.set(id, { ...rest, ...(point ? { meetingPoint: point } : {}), updatedAt: nowIso });
    },
    async deleteGroup(id) {
      groups.delete(id);
      members.delete(id);
      for (const [k, v] of invites) if (v.groupId === id) invites.delete(k);
      for (const [k, v] of alerts) if (v.groupId === id) alerts.delete(k);
    },
    async listGroupsForUser(uid, limit) {
      return [...groups.values()].filter((g) => g.memberIds.includes(uid)).slice(0, limit);
    },
    async countOwnedGroups(uid) {
      return [...groups.values()].filter((g) => g.ownerId === uid).length;
    },
    async getMember(gid, uid) {
      const m = members.get(gid)?.get(uid);
      return m ? structuredClone(m) : null;
    },
    async listMembers(gid) {
      return [...(members.get(gid)?.values() ?? [])].map((m) => structuredClone(m));
    },
    async putMember(gid, m) {
      members.get(gid)?.set(m.uid, structuredClone(m));
      const g = groups.get(gid);
      if (g && !g.memberIds.includes(m.uid)) g.memberIds = [...g.memberIds, m.uid];
    },
    async removeMember(gid, uid) {
      members.get(gid)?.delete(uid);
      const g = groups.get(gid);
      if (g) g.memberIds = g.memberIds.filter((x) => x !== uid);
    },
    async createInvite(i) {
      invites.set(i.code, i);
    },
    async getInvite(code) {
      return invites.get(code) ?? null;
    },
    async createAlert(a) {
      const id = `a${++n}`;
      alerts.set(id, { ...a, id });
      return id;
    },
    async getAlert(id) {
      const a = alerts.get(id);
      return a ? { ...a } : null;
    },
    async updateAlert(id, patch) {
      const a = alerts.get(id);
      if (a) alerts.set(id, { ...a, ...patch });
    },
    async listActiveAlerts(gid, limit) {
      return [...alerts.values()].filter((a) => a.groupId === gid && a.status === "ACTIVE").slice(0, limit);
    },
    async countAlertsSince(uid, since) {
      return [...alerts.values()].filter((a) => a.senderId === uid && a.createdAt >= since).length;
    },
    async listEscalatedActive(limit) {
      return [...alerts.values()].filter((a) => a.escalated && a.status === "ACTIVE").slice(0, limit);
    },
  };
  return { store, groups, members, invites, alerts };
}
