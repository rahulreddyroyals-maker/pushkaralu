/**
 * Role architecture — Spec §24.
 *
 * Roles are NEVER trusted from client-submitted data. The source of truth
 * is a Firebase Auth custom claim (`role`), set only by a Cloud Function
 * running with Admin privileges (e.g. after an admin approves a provider
 * application). Firestore Security Rules read `request.auth.token.role`.
 *
 * This file is the single shared enum used by:
 *  - client-side UI gating (show/hide, NOT security)
 *  - server-side route/action authorization
 *  - Firestore rules generation reference (see docs/ROLES_PERMISSIONS.md)
 */

export const ROLES = [
  "USER",
  "PROVIDER",
  "PUROHIT",
  "HOTEL_OWNER",
  "TRAVEL_OPERATOR",
  "BOAT_OPERATOR",
  "BUSINESS_OWNER",
  "EDITOR",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that represent an approved marketplace provider of some kind. */
export const PROVIDER_ROLES: Role[] = [
  "PROVIDER",
  "PUROHIT",
  "HOTEL_OWNER",
  "TRAVEL_OPERATOR",
  "BOAT_OPERATOR",
  "BUSINESS_OWNER",
];

/** Roles that can access the admin dashboard at all. */
export const STAFF_ROLES: Role[] = ["EDITOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

/** Roles with full platform control. */
export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function isProviderRole(role: Role): boolean {
  return PROVIDER_ROLES.includes(role);
}

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
