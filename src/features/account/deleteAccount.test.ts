import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminAuth: () => { throw new Error("must not be reached"); }, getAdminDb: () => { throw new Error("must not be reached"); } }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/features/family/store", () => ({ firestoreFamilyStore: {} }));
vi.mock("@/features/family/deps", () => ({ familyDeps: {} }));
vi.mock("@/features/family/service", () => ({ deleteGroup: vi.fn(), leaveGroup: vi.fn() }));

import { deleteAccount } from "./deleteAccount";

describe("deleteAccount guard", () => {
  it.each(["ADMIN", "SUPER_ADMIN", "EDITOR", "MODERATOR", "HOTEL_OWNER", "PUROHIT", "BUSINESS_OWNER"] as const)("refuses to delete a %s account (409) before touching any data", async (role) => {
    const r = await deleteAccount("u1", role, "Name");
    expect(r).toMatchObject({ ok: false, status: 409 });
  });
});
