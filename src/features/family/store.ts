import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import type { FamilyStore } from "./service";
import type { FamilyAlert, FamilyGroup, FamilyInvite, FamilyMember } from "./types";

/**
 * Firestore adapter. All timestamps are stored as ISO strings (lexicographic
 * order == chronological order), which keeps mapping trivial and range
 * queries correct. Clients never touch these collections: firestore.rules
 * must deny ALL client access to familyGroups (incl. members), familyInvites
 * and familyAlerts (see docs/SPRINT_7.md) — every read goes through the
 * service, which enforces membership and the location-sharing rules.
 */
const db = () => getAdminDb();
const groups = () => db().collection("familyGroups");
const members = (groupId: string) => groups().doc(groupId).collection("members");

const asGroup = (id: string, d: DocumentData): FamilyGroup => ({
  id,
  name: d.name,
  ownerId: d.ownerId,
  memberIds: d.memberIds ?? [],
  ...(d.meetingPoint ? { meetingPoint: d.meetingPoint } : {}),
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

const asAlert = (id: string, d: DocumentData): FamilyAlert => ({ ...(d as Omit<FamilyAlert, "id">), id });

/** Deletes every doc of a query in batches of 400 (Firestore batch limit is 500). */
async function deleteQuery(query: FirebaseFirestore.Query): Promise<void> {
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return;
    const batch = db().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export const firestoreFamilyStore: FamilyStore = {
  async createGroup(group, owner) {
    const ref = groups().doc();
    const batch = db().batch();
    batch.set(ref, group);
    batch.set(ref.collection("members").doc(owner.uid), owner);
    await batch.commit();
    return ref.id;
  },
  async getGroup(id) {
    const snap = await groups().doc(id).get();
    return snap.exists ? asGroup(snap.id, snap.data()!) : null;
  },
  async setMeetingPoint(id, point, nowIso) {
    await groups().doc(id).update({ meetingPoint: point ?? FieldValue.delete(), updatedAt: nowIso });
  },
  async deleteGroup(id) {
    await deleteQuery(members(id));
    await deleteQuery(db().collection("familyInvites").where("groupId", "==", id));
    await deleteQuery(db().collection("familyAlerts").where("groupId", "==", id));
    await groups().doc(id).delete();
  },
  async listGroupsForUser(uid, limit) {
    const snap = await groups().where("memberIds", "array-contains", uid).limit(limit).get();
    return snap.docs.map((d) => asGroup(d.id, d.data()));
  },
  async countOwnedGroups(uid) {
    const snap = await groups().where("ownerId", "==", uid).count().get();
    return snap.data().count;
  },
  async getMember(groupId, uid) {
    const snap = await members(groupId).doc(uid).get();
    return snap.exists ? (snap.data() as FamilyMember) : null;
  },
  async listMembers(groupId) {
    const snap = await members(groupId).get();
    return snap.docs.map((d) => d.data() as FamilyMember);
  },
  async putMember(groupId, member) {
    const batch = db().batch();
    // set() without merge: removed optional fields (location, emergency contact) really disappear.
    batch.set(members(groupId).doc(member.uid), member);
    batch.update(groups().doc(groupId), { memberIds: FieldValue.arrayUnion(member.uid) });
    await batch.commit();
  },
  async removeMember(groupId, uid) {
    const batch = db().batch();
    batch.delete(members(groupId).doc(uid));
    batch.update(groups().doc(groupId), { memberIds: FieldValue.arrayRemove(uid) });
    await batch.commit();
  },
  async createInvite(invite: FamilyInvite) {
    await db().collection("familyInvites").doc(invite.code).set(invite);
  },
  async getInvite(code) {
    const snap = await db().collection("familyInvites").doc(code).get();
    return snap.exists ? (snap.data() as FamilyInvite) : null;
  },
  async createAlert(alert) {
    const ref = db().collection("familyAlerts").doc();
    await ref.set(alert);
    return ref.id;
  },
  async getAlert(id) {
    const snap = await db().collection("familyAlerts").doc(id).get();
    return snap.exists ? asAlert(snap.id, snap.data()!) : null;
  },
  async updateAlert(id, patch) {
    const data: Record<string, unknown> = { ...patch };
    delete data.id;
    await db().collection("familyAlerts").doc(id).update(data);
  },
  async listActiveAlerts(groupId, limit) {
    const snap = await db().collection("familyAlerts").where("groupId", "==", groupId).where("status", "==", "ACTIVE").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => asAlert(d.id, d.data()));
  },
  async countAlertsSince(senderId, sinceIso) {
    const snap = await db().collection("familyAlerts").where("senderId", "==", senderId).where("createdAt", ">=", sinceIso).count().get();
    return snap.data().count;
  },
  async listEscalatedActive(limit) {
    const snap = await db().collection("familyAlerts").where("escalated", "==", true).where("status", "==", "ACTIVE").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => asAlert(d.id, d.data()));
  },
};
