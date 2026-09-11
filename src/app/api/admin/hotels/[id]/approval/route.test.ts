import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getServerUserMock, getHotelMock, setHotelApprovalMock, assignRoleMock, writeAuditLogMock } = vi.hoisted(() => ({
  getServerUserMock: vi.fn(),
  getHotelMock: vi.fn(),
  setHotelApprovalMock: vi.fn(),
  assignRoleMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getServerUser: getServerUserMock }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/lib/auth/assignRole", () => ({ assignRole: assignRoleMock }));
vi.mock("@/features/hotels/api", () => ({
  getHotel: getHotelMock,
  setHotelApproval: setHotelApprovalMock,
}));

const { PATCH } = await import("./route");

const params = { params: Promise.resolve({ id: "hotel-1" }) };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/hotels/hotel-1/approval", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getHotelMock.mockResolvedValue({ id: "hotel-1", ownerId: "owner-uid", approvalStatus: "PENDING" });
  assignRoleMock.mockResolvedValue({ ok: true, previousRole: "USER", newRole: "HOTEL_OWNER" });
});

describe("PATCH /api/admin/hotels/[id]/approval — unauthorized access", () => {
  it("denies an unauthenticated caller", async () => {
    getServerUserMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ approvalStatus: "VERIFIED", reason: "docs checked" }), params);
    expect(res.status).toBe(401);
    expect(setHotelApprovalMock).not.toHaveBeenCalled();
  });

  it("denies a plain USER", async () => {
    getServerUserMock.mockResolvedValue({ uid: "u1", role: "USER" });
    const res = await PATCH(makeRequest({ approvalStatus: "VERIFIED", reason: "docs checked" }), params);
    expect(res.status).toBe(403);
    expect(setHotelApprovalMock).not.toHaveBeenCalled();
  });

  it("denies a MODERATOR (approval is ADMIN-level, not moderator-level)", async () => {
    getServerUserMock.mockResolvedValue({ uid: "mod-1", role: "MODERATOR" });
    const res = await PATCH(makeRequest({ approvalStatus: "VERIFIED", reason: "docs checked" }), params);
    expect(res.status).toBe(403);
  });

  it("404s when the hotel doesn't exist", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });
    getHotelMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ approvalStatus: "VERIFIED", reason: "docs checked" }), params);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/hotels/[id]/approval — verification grants the role", () => {
  it("ADMIN verifying a hotel sets approval AND grants HOTEL_OWNER to the listing's owner", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const res = await PATCH(makeRequest({ approvalStatus: "VERIFIED", reason: "Docs verified" }), params);

    expect(res.status).toBe(200);
    expect(setHotelApprovalMock).toHaveBeenCalledWith("hotel-1", "VERIFIED");
    expect(assignRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetUid: "owner-uid", newRole: "HOTEL_OWNER", actorUid: "admin-1" })
    );
  });

  it("rejecting a hotel does NOT attempt a role grant", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });

    const res = await PATCH(makeRequest({ approvalStatus: "REJECTED", reason: "Incomplete documents" }), params);

    expect(res.status).toBe(200);
    expect(setHotelApprovalMock).toHaveBeenCalledWith("hotel-1", "REJECTED");
    expect(assignRoleMock).not.toHaveBeenCalled();
  });
});
