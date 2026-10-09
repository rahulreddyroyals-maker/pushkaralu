import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getServerUserMock, getBookingMock, updateBookingStatusMock, writeAuditLogMock } = vi.hoisted(() => ({
  getServerUserMock: vi.fn(),
  getBookingMock: vi.fn(),
  updateBookingStatusMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getServerUser: getServerUserMock }));
vi.mock("@/features/notifications/booking", () => ({ notifyBooking: vi.fn() }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/features/bookings/api", () => ({
  getBooking: getBookingMock,
  updateBookingStatus: updateBookingStatusMock,
}));

const { PATCH } = await import("./route");

const params = { params: Promise.resolve({ id: "booking-1" }) };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/bookings/booking-1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const PENDING_BOOKING = {
  id: "booking-1",
  userId: "customer-uid",
  providerOwnerId: "provider-uid",
  status: "PENDING",
};

beforeEach(() => {
  vi.clearAllMocks();
  getBookingMock.mockResolvedValue(PENDING_BOOKING);
});

describe("PATCH /api/bookings/[id]/status — access control", () => {
  it("denies an unauthenticated caller", async () => {
    getServerUserMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ status: "CONFIRMED" }), params);
    expect(res.status).toBe(401);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("denies a signed-in user who is neither the customer nor the provider", async () => {
    getServerUserMock.mockResolvedValue({ uid: "random-uid", role: "USER" });
    const res = await PATCH(makeRequest({ status: "CANCELLED" }), params);
    expect(res.status).toBe(403);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("404s for a booking that doesn't exist", async () => {
    getServerUserMock.mockResolvedValue({ uid: "customer-uid", role: "USER" });
    getBookingMock.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ status: "CANCELLED" }), params);
    expect(res.status).toBe(404);
  });

  it("rejects an invalid status value", async () => {
    getServerUserMock.mockResolvedValue({ uid: "customer-uid", role: "USER" });
    const res = await PATCH(makeRequest({ status: "NOT_A_STATUS" }), params);
    expect(res.status).toBe(400);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/bookings/[id]/status — state machine enforcement", () => {
  it("lets the provider confirm a pending booking", async () => {
    getServerUserMock.mockResolvedValue({ uid: "provider-uid", role: "HOTEL_OWNER" });
    const res = await PATCH(makeRequest({ status: "CONFIRMED" }), params);
    expect(res.status).toBe(200);
    expect(updateBookingStatusMock).toHaveBeenCalledWith("booking-1", "CONFIRMED");
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BOOKING_STATUS_CHANGED", metadata: expect.objectContaining({ from: "PENDING", to: "CONFIRMED", actor: "provider" }) })
    );
  });

  it("blocks the CUSTOMER from confirming their own booking — 409, not silently allowed", async () => {
    getServerUserMock.mockResolvedValue({ uid: "customer-uid", role: "USER" });
    const res = await PATCH(makeRequest({ status: "CONFIRMED" }), params);
    expect(res.status).toBe(409);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("lets the customer cancel their own pending booking", async () => {
    getServerUserMock.mockResolvedValue({ uid: "customer-uid", role: "USER" });
    const res = await PATCH(makeRequest({ status: "CANCELLED" }), params);
    expect(res.status).toBe(200);
  });

  it("blocks a provider from issuing a refund — money-moving transitions are admin-only", async () => {
    getBookingMock.mockResolvedValue({ ...PENDING_BOOKING, status: "CONFIRMED" });
    getServerUserMock.mockResolvedValue({ uid: "provider-uid", role: "HOTEL_OWNER" });
    const res = await PATCH(makeRequest({ status: "REFUNDED" }), params);
    expect(res.status).toBe(409);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("lets an admin refund a confirmed booking", async () => {
    getBookingMock.mockResolvedValue({ ...PENDING_BOOKING, status: "CONFIRMED" });
    getServerUserMock.mockResolvedValue({ uid: "admin-uid", role: "ADMIN" });
    const res = await PATCH(makeRequest({ status: "REFUNDED" }), params);
    expect(res.status).toBe(200);
  });

  it("blocks reviving a CANCELLED booking, even for an admin", async () => {
    getBookingMock.mockResolvedValue({ ...PENDING_BOOKING, status: "CANCELLED" });
    getServerUserMock.mockResolvedValue({ uid: "admin-uid", role: "ADMIN" });
    const res = await PATCH(makeRequest({ status: "CONFIRMED" }), params);
    expect(res.status).toBe(409);
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("treats an admin as 'admin' even when they're also the customer on the booking", async () => {
    getServerUserMock.mockResolvedValue({ uid: "customer-uid", role: "ADMIN" });
    const res = await PATCH(makeRequest({ status: "CONFIRMED" }), params);
    // admin CAN confirm from PENDING, whereas a plain customer cannot —
    // this pins down the precedence order of the actor check.
    expect(res.status).toBe(200);
  });
});
