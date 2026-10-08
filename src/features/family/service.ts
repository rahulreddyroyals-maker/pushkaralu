import { canModerateContent } from "@/lib/auth/guards";
import { SAFETY_LIMITS } from "@/config/app";
import { fail, forbidden, notFound, ok, unauthenticated, type Actor, type AuditSink, type ServiceResult } from "@/lib/serviceResult";
import { alertSchema, createGroupSchema, joinSchema, locationSchema, meetingPointSchema, profileSchema, sharingSchema } from "./schemas";
import type { EscalatedAlertView, FamilyAlert, FamilyGroup, FamilyInvite, FamilyMember, GroupView, MeetingPoint, MemberView } from "./types";

/** Persistence port. Firestore adapter: ./store.ts. Tests: ./memoryStore.ts. */
export interface FamilyStore {
  createGroup(group: Omit<FamilyGroup, "id">, owner: FamilyMember): Promise<string>;
  getGroup(id: string): Promise<FamilyGroup | null>;
  setMeetingPoint(id: string, point: MeetingPoint | null, nowIso: string): Promise<void>;
  /** Deletes the group AND its members, invites and alerts. */
  deleteGroup(id: string): Promise<void>;
  listGroupsForUser(uid: string, limit: number): Promise<FamilyGroup[]>;
  countOwnedGroups(uid: string): Promise<number>;
  getMember(groupId: string, uid: string): Promise<FamilyMember | null>;
  listMembers(groupId: string): Promise<FamilyMember[]>;
  /** Creates or replaces the member AND keeps group.memberIds in sync. */
  putMember(groupId: string, member: FamilyMember): Promise<void>;
  removeMember(groupId: string, uid: string): Promise<void>;
  createInvite(invite: FamilyInvite): Promise<void>;
  getInvite(code: string): Promise<FamilyInvite | null>;
  createAlert(alert: Omit<FamilyAlert, "id">): Promise<string>;
  getAlert(id: string): Promise<FamilyAlert | null>;
  updateAlert(id: string, patch: Partial<FamilyAlert>): Promise<void>;
  listActiveAlerts(groupId: string, limit: number): Promise<FamilyAlert[]>;
  countAlertsSince(senderId: string, sinceIso: string): Promise<number>;
  listEscalatedActive(limit: number): Promise<FamilyAlert[]>;
}

export interface Deps {
  store: FamilyStore;
  audit: AuditSink;
  newCode: () => string;
  now?: () => Date;
}

const nowOf = (deps: Deps) => (deps.now ?? (() => new Date()))();

/* ───────── views (explicit whitelists — the privacy boundary) ───────── */

export function sharingIsActive(member: FamilyMember, now: Date): boolean {
  return member.sharing.enabled && !!member.sharing.until && Date.parse(member.sharing.until) > now.getTime();
}

export function toMemberView(member: FamilyMember, viewerUid: string, now: Date): MemberView {
  const active = sharingIsActive(member, now);
  return {
    uid: member.uid,
    displayName: member.displayName,
    role: member.role,
    ...(member.emergencyContact ? { emergencyContact: member.emergencyContact } : {}),
    sharingActive: active,
    // A location is released ONLY while sharing is active, even if a stale fix is still stored.
    ...(active && member.lastLocation ? { location: member.lastLocation } : {}),
    ...(active && member.uid === viewerUid ? { sharingUntil: member.sharing.until } : {}),
  };
}

function toGroupAlertView(a: FamilyAlert): GroupView["activeAlerts"][number] {
  return {
    id: a.id,
    groupId: a.groupId,
    groupName: a.groupName,
    senderId: a.senderId,
    senderName: a.senderName,
    message: a.message,
    ...(a.location ? { location: a.location } : {}),
    escalated: a.escalated,
    status: a.status,
    ...(a.resolvedAt ? { resolvedAt: a.resolvedAt } : {}),
    createdAt: a.createdAt,
  };
}

/** Loads the group only if the actor is a member; "not a member" and "no such group" are deliberately identical (404). */
async function loadAsMember(deps: Deps, actor: Actor, groupId: string): Promise<{ group: FamilyGroup; me: FamilyMember } | null> {
  const group = await deps.store.getGroup(groupId);
  if (!group || !group.memberIds.includes(actor.uid)) return null;
  const me = await deps.store.getMember(groupId, actor.uid);
  return me ? { group, me } : null;
}

/* ───────── groups ───────── */

export async function createGroup(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ id: string }>> {
  if (!actor) return unauthenticated();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  if ((await deps.store.countOwnedGroups(actor.uid)) >= SAFETY_LIMITS.familyGroupsPerOwner) {
    return fail(429, `You can own up to ${SAFETY_LIMITS.familyGroupsPerOwner} groups`);
  }
  const iso = nowOf(deps).toISOString();
  const id = await deps.store.createGroup(
    { name: parsed.data.name, ownerId: actor.uid, memberIds: [actor.uid], createdAt: iso, updatedAt: iso },
    {
      uid: actor.uid,
      displayName: actor.displayName,
      role: "OWNER",
      ...(parsed.data.emergencyContact ? { emergencyContact: parsed.data.emergencyContact } : {}),
      sharing: { enabled: false }, // location sharing starts OFF for everyone, always
      joinedAt: iso,
    }
  );
  return ok({ id }, 201);
}

export async function listMyGroups(deps: Deps, actor: Actor | null): Promise<ServiceResult<{ items: { id: string; name: string; isOwner: boolean; memberCount: number }[] }>> {
  if (!actor) return unauthenticated();
  const groups = await deps.store.listGroupsForUser(actor.uid, 50);
  return ok({ items: groups.map((g) => ({ id: g.id, name: g.name, isOwner: g.ownerId === actor.uid, memberCount: g.memberIds.length })) });
}

export async function getGroupView(deps: Deps, actor: Actor | null, groupId: string): Promise<ServiceResult<GroupView>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const now = nowOf(deps);
  const [members, alerts] = await Promise.all([deps.store.listMembers(groupId), deps.store.listActiveAlerts(groupId, 10)]);
  return ok({
    group: { id: ctx.group.id, name: ctx.group.name, ownerId: ctx.group.ownerId, ...(ctx.group.meetingPoint ? { meetingPoint: ctx.group.meetingPoint } : {}) },
    me: toMemberView(ctx.me, actor.uid, now),
    members: members.map((m) => toMemberView(m, actor.uid, now)),
    activeAlerts: alerts.map(toGroupAlertView),
  });
}

export async function deleteGroup(deps: Deps, actor: Actor | null, groupId: string): Promise<ServiceResult<{ deleted: true }>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  if (ctx.group.ownerId !== actor.uid) return forbidden();
  await deps.store.deleteGroup(groupId); // takes members' stored locations and alerts with it
  return ok({ deleted: true });
}

/* ───────── invites & membership ───────── */

export async function createInvite(deps: Deps, actor: Actor | null, groupId: string): Promise<ServiceResult<{ code: string; expiresAt: string }>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  if (ctx.group.ownerId !== actor.uid) return forbidden();
  const now = nowOf(deps);
  const expiresAt = new Date(now.getTime() + SAFETY_LIMITS.familyInviteTtlHours * 3_600_000).toISOString();
  const code = deps.newCode();
  await deps.store.createInvite({ code, groupId, createdBy: actor.uid, expiresAt, createdAt: now.toISOString() });
  return ok({ code, expiresAt }, 201);
}

export async function joinWithCode(deps: Deps, actor: Actor | null, body: unknown): Promise<ServiceResult<{ groupId: string }>> {
  if (!actor) return unauthenticated();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const now = nowOf(deps);

  const invite = await deps.store.getInvite(parsed.data.code);
  // Unknown, expired, or pointing at a deleted group: all the same answer, so codes can't be probed.
  if (!invite || Date.parse(invite.expiresAt) <= now.getTime()) return fail(404, "That invite code isn't valid or has expired");
  const group = await deps.store.getGroup(invite.groupId);
  if (!group) return fail(404, "That invite code isn't valid or has expired");

  if (group.memberIds.includes(actor.uid)) return ok({ groupId: group.id }); // idempotent
  if (group.memberIds.length >= SAFETY_LIMITS.familyMembersPerGroup) return fail(409, "This group is full");

  await deps.store.putMember(group.id, {
    uid: actor.uid,
    displayName: actor.displayName,
    role: "MEMBER",
    ...(parsed.data.emergencyContact ? { emergencyContact: parsed.data.emergencyContact } : {}),
    sharing: { enabled: false }, // joining never turns sharing on
    joinedAt: now.toISOString(),
  });
  return ok({ groupId: group.id }, 201);
}

export async function leaveGroup(deps: Deps, actor: Actor | null, groupId: string): Promise<ServiceResult<{ left: true }>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  if (ctx.group.ownerId === actor.uid) return fail(409, "The owner can't leave — delete the group instead");
  await deps.store.removeMember(groupId, actor.uid); // member doc (with any stored location) is removed
  return ok({ left: true });
}

export async function removeMember(deps: Deps, actor: Actor | null, groupId: string, targetUid: string): Promise<ServiceResult<{ removed: true }>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  if (ctx.group.ownerId !== actor.uid) return forbidden();
  if (targetUid === actor.uid) return fail(400, "Use delete group to remove yourself as owner");
  if (!ctx.group.memberIds.includes(targetUid)) return notFound();
  await deps.store.removeMember(groupId, targetUid);
  return ok({ removed: true });
}

/** A member edits ONLY their own emergency contact. */
export async function updateMyProfile(deps: Deps, actor: Actor | null, groupId: string, body: unknown): Promise<ServiceResult<{ updated: true }>> {
  if (!actor) return unauthenticated();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const { emergencyContact: _old, ...rest } = ctx.me;
  void _old;
  await deps.store.putMember(groupId, { ...rest, ...(parsed.data.emergencyContact ? { emergencyContact: parsed.data.emergencyContact } : {}) });
  return ok({ updated: true });
}

/* ───────── location sharing (opt-in, time-boxed, self-only) ───────── */

export async function setSharing(deps: Deps, actor: Actor | null, groupId: string, body: unknown): Promise<ServiceResult<{ sharingActive: boolean; sharingUntil?: string }>> {
  if (!actor) return unauthenticated();
  const parsed = sharingSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const now = nowOf(deps);

  if (!parsed.data.enabled) {
    // Turning off ALSO erases the stored fix — nothing about where you were lingers.
    const { lastLocation: _loc, ...rest } = ctx.me;
    void _loc;
    await deps.store.putMember(groupId, { ...rest, sharing: { enabled: false } });
    return ok({ sharingActive: false });
  }
  const until = new Date(now.getTime() + parsed.data.durationHours * 3_600_000).toISOString();
  await deps.store.putMember(groupId, { ...ctx.me, sharing: { enabled: true, until } });
  return ok({ sharingActive: true, sharingUntil: until });
}

/** A member may only ever write THEIR OWN location, and only while their own sharing window is open. */
export async function updateMyLocation(deps: Deps, actor: Actor | null, groupId: string, body: unknown): Promise<ServiceResult<{ updatedAt: string }>> {
  if (!actor) return unauthenticated();
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const now = nowOf(deps);

  if (!sharingIsActive(ctx.me, now)) {
    if (ctx.me.sharing.enabled || ctx.me.lastLocation) {
      // Window expired: close it and erase the stale fix rather than leaving it around.
      const { lastLocation: _loc, ...rest } = ctx.me;
      void _loc;
      await deps.store.putMember(groupId, { ...rest, sharing: { enabled: false } });
    }
    return fail(403, "Location sharing is off");
  }
  const updatedAt = now.toISOString();
  await deps.store.putMember(groupId, {
    ...ctx.me,
    lastLocation: { latitude: parsed.data.latitude, longitude: parsed.data.longitude, ...(parsed.data.accuracyMeters !== undefined ? { accuracyMeters: parsed.data.accuracyMeters } : {}), updatedAt },
  });
  return ok({ updatedAt });
}

/* ───────── meeting point ───────── */

export async function setMeetingPoint(deps: Deps, actor: Actor | null, groupId: string, body: unknown): Promise<ServiceResult<{ set: true }>> {
  if (!actor) return unauthenticated();
  const parsed = meetingPointSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const now = nowOf(deps).toISOString();
  await deps.store.setMeetingPoint(
    groupId,
    {
      name: parsed.data.name,
      location: { latitude: parsed.data.latitude, longitude: parsed.data.longitude },
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
      ...(parsed.data.meetAt ? { meetAt: new Date(parsed.data.meetAt).toISOString() } : {}),
      setBy: actor.uid,
      setByName: actor.displayName,
      setAt: now,
    },
    now
  );
  return ok({ set: true });
}

export async function clearMeetingPoint(deps: Deps, actor: Actor | null, groupId: string): Promise<ServiceResult<{ cleared: true }>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  await deps.store.setMeetingPoint(groupId, null, nowOf(deps).toISOString());
  return ok({ cleared: true });
}

/* ───────── emergency alerts ───────── */

export async function sendAlert(deps: Deps, actor: Actor | null, groupId: string, body: unknown): Promise<ServiceResult<{ id: string }>> {
  if (!actor) return unauthenticated();
  const parsed = alertSchema.safeParse(body);
  if (!parsed.success) return fail(400, "Invalid request", parsed.error.flatten());
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const now = nowOf(deps);

  const since = new Date(now.getTime() - 3_600_000).toISOString();
  if ((await deps.store.countAlertsSince(actor.uid, since)) >= SAFETY_LIMITS.familyAlertsPerHour) {
    return fail(429, "You've sent several alerts in the last hour. If this is an emergency, call emergency services directly.");
  }
  const input = parsed.data;
  const id = await deps.store.createAlert({
    groupId,
    groupName: ctx.group.name,
    senderId: actor.uid, // from the session, never the body
    senderName: actor.displayName,
    message: input.message,
    ...(input.includeLocation && input.latitude !== undefined && input.longitude !== undefined ? { location: { latitude: input.latitude, longitude: input.longitude } } : {}),
    escalated: input.escalate,
    ...(input.escalate && input.callbackPhone ? { callbackPhone: input.callbackPhone } : {}),
    status: "ACTIVE",
    createdAt: now.toISOString(),
  });
  return ok({ id }, 201);
}

/** The sender or the group owner closes an alert. */
export async function resolveAlert(deps: Deps, actor: Actor | null, groupId: string, alertId: string): Promise<ServiceResult<{ resolved: true }>> {
  if (!actor) return unauthenticated();
  const ctx = await loadAsMember(deps, actor, groupId);
  if (!ctx) return notFound();
  const alert = await deps.store.getAlert(alertId);
  if (!alert || alert.groupId !== groupId) return notFound();
  if (alert.senderId !== actor.uid && ctx.group.ownerId !== actor.uid) return forbidden();
  if (alert.status === "RESOLVED") return ok({ resolved: true });
  await deps.store.updateAlert(alertId, { status: "RESOLVED", resolvedAt: nowOf(deps).toISOString() });
  return ok({ resolved: true });
}

/* ───────── platform staff: escalated alerts only ───────── */

/** Staff see ONLY alerts whose sender chose to escalate — never groups, rosters or ongoing locations. */
export async function listEscalatedAlerts(deps: Deps, actor: Actor | null): Promise<ServiceResult<{ items: EscalatedAlertView[] }>> {
  if (!actor) return unauthenticated();
  if (!canModerateContent(actor.role)) return forbidden();
  const alerts = await deps.store.listEscalatedActive(50);
  return ok({
    items: alerts.map((a) => ({
      id: a.id,
      groupName: a.groupName,
      senderName: a.senderName,
      message: a.message,
      ...(a.location ? { location: a.location } : {}),
      ...(a.callbackPhone ? { callbackPhone: a.callbackPhone } : {}),
      createdAt: a.createdAt,
      ...(a.acknowledgedBy ? { acknowledgedBy: a.acknowledgedBy } : {}),
    })),
  });
}

export async function acknowledgeEscalatedAlert(deps: Deps, actor: Actor | null, alertId: string): Promise<ServiceResult<{ acknowledged: true }>> {
  if (!actor) return unauthenticated();
  if (!canModerateContent(actor.role)) return forbidden();
  const alert = await deps.store.getAlert(alertId);
  if (!alert || !alert.escalated) return notFound(); // can't touch non-escalated (private) alerts
  await deps.store.updateAlert(alertId, { acknowledgedBy: actor.uid, acknowledgedAt: nowOf(deps).toISOString() });
  await deps.audit({ actorUid: actor.uid, action: "FAMILY_ALERT_ACKNOWLEDGED", targetType: "familyAlert", targetId: alertId });
  return ok({ acknowledged: true });
}
