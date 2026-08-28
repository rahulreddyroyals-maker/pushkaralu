import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getServerUserMock, setCustomUserClaimsMock, updateMock, getMock, addMock, writeAuditLogMock } = vi.hoisted(
  () => ({
    getServerUserMock: vi.fn(),
    setCustomUserClaimsMock: vi.fn(),
    updateMock: vi.fn(),
    getMock: vi.fn(),
    addMock: vi.fn(),
    writeAuditLogMock: vi.fn(),
  })
);

vi.mock("@/lib/auth/session", () => ({
  getServerUser: getServerUserMock,
}));

vi.mock("@/lib/audit/log", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP" },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    setCustomUserClaims: setCustomUserClaimsMock,
  }),
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: getMock,
        update: updateMock,
      }),
      add: addMock,
    }),
  }),
}));

// Imported AFTER the mocks are registered, per Vitest hoisting rules.
const { POST } = await import("./route");

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/users/target-uid/role", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const targetParams = { params: Promise.resolve({ uid: "target-uid" }) };

beforeEach(() => {
  vi.clearAllMocks();
  getMock.mockResolvedValue({ exists: true, data: () => ({ role: "USER" }) });
});

describe("POST /api/admin/users/[uid]/role — unauthorized access", () => {
  it("rejects an unauthenticated caller with 401, before touching Admin SDK", async () => {
    getServerUserMock.mockResolvedValue(null);

    const res = await POST(makeRequest({ role: "PUROHIT", reason: "test" }), targetParams);

    expect(res.status).toBe(401);
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with 400", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const res = await POST(makeRequest({ role: "NOT_A_REAL_ROLE", reason: "test" }), targetParams);

    expect(res.status).toBe(400);
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it("rejects a MODERATOR trying to assign any role — 403, no mutation happens", async () => {
    getServerUserMock.mockResolvedValue({ uid: "mod-1", role: "MODERATOR" });

    const res = await POST(makeRequest({ role: "PUROHIT", reason: "test" }), targetParams);

    expect(res.status).toBe(403);
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("rejects an ADMIN trying to mint a SUPER_ADMIN — 403 (privilege escalation blocked)", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const res = await POST(makeRequest({ role: "SUPER_ADMIN", reason: "test" }), targetParams);

    expect(res.status).toBe(403);
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it("rejects a plain USER trying to self-assign PUROHIT — 403", async () => {
    getServerUserMock.mockResolvedValue({ uid: "user-1", role: "USER" });

    const res = await POST(makeRequest({ role: "PUROHIT", reason: "self-promote" }), targetParams);

    expect(res.status).toBe(403);
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user doesn't exist", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });
    getMock.mockResolvedValue({ exists: false });

    const res = await POST(makeRequest({ role: "PUROHIT", reason: "test" }), targetParams);

    expect(res.status).toBe(404);
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/users/[uid]/role — authorized path", () => {
  it("ADMIN assigning PUROHIT succeeds, sets the claim, and writes an audit log", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const res = await POST(makeRequest({ role: "PUROHIT", reason: "Verified documents" }), targetParams);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.newRole).toBe("PUROHIT");
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith("target-uid", { role: "PUROHIT" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "PUROHIT" })
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUid: "admin-1",
        action: "ROLE_ASSIGNED",
        targetId: "target-uid",
        metadata: expect.objectContaining({ newRole: "PUROHIT", previousRole: "USER" }),
      })
    );
  });

  it("SUPER_ADMIN can grant ADMIN", async () => {
    getServerUserMock.mockResolvedValue({ uid: "super-1", role: "SUPER_ADMIN" });

    const res = await POST(makeRequest({ role: "ADMIN", reason: "Promoting trusted staff" }), targetParams);

    expect(res.status).toBe(200);
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith("target-uid", { role: "ADMIN" });
  });
});
