import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";

const { getMock, updateBookingPaymentMock, updateBookingStatusMock, writeAuditLogMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  updateBookingPaymentMock: vi.fn(),
  updateBookingStatusMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/features/notifications/booking", () => ({ notifyBooking: vi.fn() }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/features/bookings/api", () => ({
  updateBookingPayment: updateBookingPaymentMock,
  updateBookingStatus: updateBookingStatusMock,
}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({ where: () => ({ limit: () => ({ get: getMock }) }) }),
  }),
}));

const TEST_SECRET = "test-webhook-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

const { POST } = await import("./route");

function sign(body: string, secret = TEST_SECRET) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(body: string, signature: string | null) {
  const headers = new Headers();
  if (signature) headers.set("x-razorpay-signature", signature);
  return new NextRequest("http://localhost/api/webhooks/razorpay", { method: "POST", body, headers });
}

function capturedEvent(orderId = "order_1") {
  return JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: orderId } } },
  });
}

function mockBookingFound(data: Record<string, unknown>) {
  getMock.mockResolvedValue({ empty: false, docs: [{ id: "booking-1", data: () => data }] });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBookingFound({ paymentStatus: "PENDING", status: "PENDING" });
});

describe("POST /api/webhooks/razorpay — signature is the authentication", () => {
  it("rejects a forged signature with 401 and touches nothing", async () => {
    const body = capturedEvent();
    const res = await POST(makeRequest(body, sign(body, "attacker-secret")));
    expect(res.status).toBe(401);
    expect(updateBookingPaymentMock).not.toHaveBeenCalled();
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("rejects a missing signature header", async () => {
    const res = await POST(makeRequest(capturedEvent(), null));
    expect(res.status).toBe(401);
    expect(updateBookingPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered body carrying an otherwise-valid signature", async () => {
    const original = capturedEvent("order_1");
    const validSig = sign(original);
    const tampered = capturedEvent("order_ATTACKER");
    const res = await POST(makeRequest(tampered, validSig));
    expect(res.status).toBe(401);
    expect(updateBookingPaymentMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/razorpay — payment.captured", () => {
  it("marks the booking paid and auto-confirms a pending booking", async () => {
    const body = capturedEvent();
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(updateBookingPaymentMock).toHaveBeenCalledWith("booking-1", "PAID", "order_1", "pay_1");
    expect(updateBookingStatusMock).toHaveBeenCalledWith("booking-1", "CONFIRMED");
  });

  it("is idempotent — a repeat capture for an already-PAID booking changes nothing", async () => {
    mockBookingFound({ paymentStatus: "PAID", status: "CONFIRMED" });
    const body = capturedEvent();
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alreadyProcessed: true });
    expect(updateBookingPaymentMock).not.toHaveBeenCalled();
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });

  it("does not downgrade a CANCELLED booking back to CONFIRMED on a late capture", async () => {
    mockBookingFound({ paymentStatus: "PENDING", status: "CANCELLED" });
    const body = capturedEvent();
    await POST(makeRequest(body, sign(body)));
    expect(updateBookingPaymentMock).toHaveBeenCalledWith("booking-1", "PAID", "order_1", "pay_1");
    expect(updateBookingStatusMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/razorpay — unmatched and irrelevant events", () => {
  it("acknowledges (not 404s) an order that matches no booking, so Razorpay stops retrying", async () => {
    getMock.mockResolvedValue({ empty: true, docs: [] });
    const body = capturedEvent("order_unknown");
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ unmatched: true });
  });

  it("ignores an event type it doesn't handle", async () => {
    const body = JSON.stringify({
      event: "subscription.charged",
      payload: { payment: { entity: { id: "pay_2", order_id: "order_1" } } },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ignored: true });
    expect(updateBookingPaymentMock).not.toHaveBeenCalled();
  });
});
