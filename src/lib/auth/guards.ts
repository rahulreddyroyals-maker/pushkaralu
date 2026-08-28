import { ADMIN_ROLES, PROVIDER_ROLES, STAFF_ROLES, ROLES, type Role } from "@/types/roles";

/**
 * Pure authorization logic — deliberately has zero Firebase dependency so
 * it can be unit tested without any live backend, and reused identically
 * on the client (for UI gating) and server (for real enforcement).
 *
 * IMPORTANT: these functions answer "is role X allowed to do Y" given a
 * role that has ALREADY been verified server-side (Firebase custom claim).
 * They are not themselves a source of trust for what the role IS.
 */

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasAnyRole(role: Role | null | undefined, allowed: Role[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export function canAccessAdminDashboard(role: Role | null | undefined): boolean {
  return hasAnyRole(role, STAFF_ROLES);
}

export function canManageEvents(role: Role | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canModerateContent(role: Role | null | undefined): boolean {
  return hasAnyRole(role, [...ADMIN_ROLES, "MODERATOR"]);
}

export function canApproveProviders(role: Role | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canAssignRole(callerRole: Role | null | undefined, targetRole: Role): boolean {
  if (!callerRole) return false;
  // Only SUPER_ADMIN can create/promote another ADMIN or SUPER_ADMIN — see
  // docs/ROLES_PERMISSIONS.md "Open Question", resolved here as: restrict
  // to avoid privilege-escalation chains.
  if (targetRole === "ADMIN" || targetRole === "SUPER_ADMIN") {
    return callerRole === "SUPER_ADMIN";
  }
  return hasAnyRole(callerRole, ADMIN_ROLES);
}

export function canManageOwnListing(
  role: Role | null | undefined,
  listingOwnerUid: string,
  currentUid: string | null | undefined
): boolean {
  if (!role || !currentUid) return false;
  if (hasAnyRole(role, ADMIN_ROLES)) return true;
  return PROVIDER_ROLES.includes(role) && listingOwnerUid === currentUid;
}

export function canViewAuditLogs(role: Role | null | undefined): boolean {
  return hasAnyRole(role, ADMIN_ROLES);
}

export function canManageSettings(role: Role | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}
