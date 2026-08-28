import { describe, it, expect, vi, beforeEach } from "vitest";

const { getServerUserMock } = vi.hoisted(() => ({ getServerUserMock: vi.fn() }));
vi.mock("./session", () => ({ getServerUser: getServerUserMock }));

const { requireRole } = await import("./requireApiRole");

beforeEach(() => vi.clearAllMocks());

describe("requireRole", () => {
  it("returns a 401 error response for an unauthenticated caller", async () => {
    getServerUserMock.mockResolvedValue(null);
    const result = await requireRole(["ADMIN"]);
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("returns a 403 error response for an authenticated but under-privileged caller", async () => {
    getServerUserMock.mockResolvedValue({ uid: "u1", role: "USER" });
    const result = await requireRole(["ADMIN", "SUPER_ADMIN"]);
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(403);
  });

  it("returns the user when authorized", async () => {
    getServerUserMock.mockResolvedValue({ uid: "u1", role: "ADMIN" });
    const result = await requireRole(["ADMIN", "SUPER_ADMIN"]);
    expect(result.error).toBeUndefined();
    expect(result.user?.uid).toBe("u1");
  });
});
