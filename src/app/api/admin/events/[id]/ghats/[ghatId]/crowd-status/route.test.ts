import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getServerUserMock, updateCrowdStatusMock, writeAuditLogMock } = vi.hoisted(() => ({
  getServerUserMock: vi.fn(),
  updateCrowdStatusMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getServerUser: getServerUserMock }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/features/ghats/api", () => ({ updateCrowdStatus: updateCrowdStatusMock }));

const { PATCH } = await import("./route");

const params = { params: Promise.resolve({ id: "event-1", ghatId: "ghat-1" }) };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/events/event-1/ghats/ghat-1/crowd-status", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH crowd-status", () => {
  it("allows MODERATOR", async () => {
    getServerUserMock.mockResolvedValue({ uid: "mod-1", role: "MODERATOR" });
    const res = await PATCH(makeRequest({ crowdStatus: "HIGH" }), params);
    expect(res.status).toBe(200);
    expect(updateCrowdStatusMock).toHaveBeenCalledWith("event-1", "ghat-1", "HIGH", "mod-1");
  });

  it("allows ADMIN", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });
    const res = await PATCH(makeRequest({ crowdStatus: "CRITICAL" }), params);
    expect(res.status).toBe(200);
  });

  it("denies EDITOR — staff but not moderation-capable", async () => {
    getServerUserMock.mockResolvedValue({ uid: "editor-1", role: "EDITOR" });
    const res = await PATCH(makeRequest({ crowdStatus: "HIGH" }), params);
    expect(res.status).toBe(403);
    expect(updateCrowdStatusMock).not.toHaveBeenCalled();
  });

  it("denies a plain USER", async () => {
    getServerUserMock.mockResolvedValue({ uid: "user-1", role: "USER" });
    const res = await PATCH(makeRequest({ crowdStatus: "LOW" }), params);
    expect(res.status).toBe(403);
  });

  it("rejects an invalid crowd status value", async () => {
    getServerUserMock.mockResolvedValue({ uid: "admin-1", role: "ADMIN" });
    const res = await PATCH(makeRequest({ crowdStatus: "APOCALYPTIC" }), params);
    expect(res.status).toBe(400);
    expect(updateCrowdStatusMock).not.toHaveBeenCalled();
  });
});
