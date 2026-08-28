import { describe, it, expect } from "vitest";
import {
  isValidRole,
  hasAnyRole,
  canAccessAdminDashboard,
  canManageEvents,
  canModerateContent,
  canApproveProviders,
  canAssignRole,
  canManageOwnListing,
  canViewAuditLogs,
  canManageSettings,
} from "./guards";

describe("isValidRole", () => {
  it("accepts known roles", () => {
    expect(isValidRole("ADMIN")).toBe(true);
    expect(isValidRole("USER")).toBe(true);
  });
  it("rejects unknown or malicious values", () => {
    expect(isValidRole("SUPER_ADMIN; DROP TABLE users")).toBe(false);
    expect(isValidRole("root")).toBe(false);
    expect(isValidRole(null)).toBe(false);
    expect(isValidRole(undefined)).toBe(false);
    expect(isValidRole(123)).toBe(false);
    expect(isValidRole({})).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("denies when role is null/undefined (unauthenticated)", () => {
    expect(hasAnyRole(null, ["ADMIN"])).toBe(false);
    expect(hasAnyRole(undefined, ["ADMIN"])).toBe(false);
  });
});

describe("canAccessAdminDashboard", () => {
  it("allows staff roles", () => {
    expect(canAccessAdminDashboard("EDITOR")).toBe(true);
    expect(canAccessAdminDashboard("MODERATOR")).toBe(true);
    expect(canAccessAdminDashboard("ADMIN")).toBe(true);
    expect(canAccessAdminDashboard("SUPER_ADMIN")).toBe(true);
  });
  it("denies a plain USER — the common unauthorized-access case", () => {
    expect(canAccessAdminDashboard("USER")).toBe(false);
  });
  it("denies provider roles — providers are not staff", () => {
    expect(canAccessAdminDashboard("PUROHIT")).toBe(false);
    expect(canAccessAdminDashboard("HOTEL_OWNER")).toBe(false);
  });
  it("denies unauthenticated access", () => {
    expect(canAccessAdminDashboard(null)).toBe(false);
  });
});

describe("canManageEvents", () => {
  it("only allows ADMIN/SUPER_ADMIN — not EDITOR or MODERATOR", () => {
    expect(canManageEvents("ADMIN")).toBe(true);
    expect(canManageEvents("SUPER_ADMIN")).toBe(true);
    expect(canManageEvents("EDITOR")).toBe(false);
    expect(canManageEvents("MODERATOR")).toBe(false);
    expect(canManageEvents("USER")).toBe(false);
  });
});

describe("canModerateContent", () => {
  it("allows MODERATOR and above, denies EDITOR", () => {
    expect(canModerateContent("MODERATOR")).toBe(true);
    expect(canModerateContent("ADMIN")).toBe(true);
    expect(canModerateContent("EDITOR")).toBe(false);
  });
});

describe("canApproveProviders", () => {
  it("denies a provider approving themselves", () => {
    expect(canApproveProviders("PUROHIT")).toBe(false);
    expect(canApproveProviders("HOTEL_OWNER")).toBe(false);
  });
});

describe("canAssignRole — privilege escalation prevention", () => {
  it("blocks ADMIN from creating another ADMIN", () => {
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false);
  });
  it("blocks ADMIN from creating a SUPER_ADMIN", () => {
    expect(canAssignRole("ADMIN", "SUPER_ADMIN")).toBe(false);
  });
  it("allows SUPER_ADMIN to create ADMIN or SUPER_ADMIN", () => {
    expect(canAssignRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(canAssignRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
  });
  it("allows ADMIN to assign non-admin roles (e.g. approving a PUROHIT)", () => {
    expect(canAssignRole("ADMIN", "PUROHIT")).toBe(true);
  });
  it("blocks a MODERATOR from assigning any role", () => {
    expect(canAssignRole("MODERATOR", "PUROHIT")).toBe(false);
  });
  it("blocks an unauthenticated caller", () => {
    expect(canAssignRole(null, "USER")).toBe(false);
  });
});

describe("canManageOwnListing", () => {
  it("allows a provider to manage their own listing", () => {
    expect(canManageOwnListing("HOTEL_OWNER", "uid-1", "uid-1")).toBe(true);
  });
  it("denies a provider managing someone else's listing — key unauthorized-access case", () => {
    expect(canManageOwnListing("HOTEL_OWNER", "uid-1", "uid-2")).toBe(false);
  });
  it("denies a plain USER even for their own uid (not a provider role)", () => {
    expect(canManageOwnListing("USER", "uid-1", "uid-1")).toBe(false);
  });
  it("allows ADMIN to manage any listing regardless of owner", () => {
    expect(canManageOwnListing("ADMIN", "uid-1", "uid-99")).toBe(true);
  });
  it("denies when currentUid is missing (not authenticated)", () => {
    expect(canManageOwnListing("HOTEL_OWNER", "uid-1", null)).toBe(false);
  });
});

describe("canViewAuditLogs", () => {
  it("denies MODERATOR — audit logs are admin-only", () => {
    expect(canViewAuditLogs("MODERATOR")).toBe(false);
  });
  it("allows ADMIN and SUPER_ADMIN", () => {
    expect(canViewAuditLogs("ADMIN")).toBe(true);
    expect(canViewAuditLogs("SUPER_ADMIN")).toBe(true);
  });
});

describe("canManageSettings", () => {
  it("is the one capability restricted to SUPER_ADMIN only, per spec §44", () => {
    expect(canManageSettings("SUPER_ADMIN")).toBe(true);
    expect(canManageSettings("ADMIN")).toBe(false);
  });
});
