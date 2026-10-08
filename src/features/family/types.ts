import type { GeoPoint } from "@/types/domain";

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface MeetingPoint {
  name: string;
  location: GeoPoint;
  note?: string;
  meetAt?: string; // ISO
  setBy: string;
  setByName: string;
  setAt: string;
}

/** familyGroups/{id}. `memberIds` exists for membership queries and rule-free authorization checks; it is never sent to non-members. */
export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  meetingPoint?: MeetingPoint;
  createdAt: string;
  updatedAt: string;
}

export interface LocationFix extends GeoPoint {
  accuracyMeters?: number;
  updatedAt: string;
}

/** familyGroups/{id}/members/{uid} */
export interface FamilyMember {
  uid: string;
  displayName: string;
  role: "OWNER" | "MEMBER";
  emergencyContact?: EmergencyContact;
  /** Location sharing is OFF unless the member turned it on, and it always has an end time. */
  sharing: { enabled: boolean; until?: string };
  lastLocation?: LocationFix;
  joinedAt: string;
}

/** familyInvites/{code} — the code IS the document id. */
export interface FamilyInvite {
  code: string;
  groupId: string;
  createdBy: string;
  expiresAt: string;
  createdAt: string;
}

/** familyAlerts/{id} */
export interface FamilyAlert {
  id: string;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  message: string;
  /** Present ONLY if the sender attached it to this alert. */
  location?: GeoPoint;
  /** Sender opted in to also notify platform staff. */
  escalated: boolean;
  /** Where staff can reach the sender — required (and only stored) when escalating. */
  callbackPhone?: string;
  status: "ACTIVE" | "RESOLVED";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

/* ───────── Views: the only shapes that leave the service ───────── */

export interface MemberView {
  uid: string;
  displayName: string;
  role: "OWNER" | "MEMBER";
  emergencyContact?: EmergencyContact;
  /** Whether this member is sharing right now (derived at read time from `until`, so a stale `enabled` can't leak). */
  sharingActive: boolean;
  /** Only present when sharingActive. */
  location?: LocationFix;
  /** Only present on the viewer's own row. */
  sharingUntil?: string;
}

export interface GroupView {
  group: { id: string; name: string; ownerId: string; meetingPoint?: MeetingPoint };
  me: MemberView;
  members: MemberView[];
  activeAlerts: Omit<FamilyAlert, "callbackPhone" | "acknowledgedBy" | "acknowledgedAt">[];
}

/** What platform staff see of an escalated alert — no group roster, no locations of anyone but the alert's own attached point. */
export interface EscalatedAlertView {
  id: string;
  groupName: string;
  senderName: string;
  message: string;
  location?: GeoPoint;
  callbackPhone?: string;
  createdAt: string;
  acknowledgedBy?: string;
}
