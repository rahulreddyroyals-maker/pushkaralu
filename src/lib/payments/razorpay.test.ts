import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { razorpayProvider } from "./razorpay";

const TEST_SECRET = "test-webhook-secret";

function sign(body: string, secret = TEST_SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;
});

afterEach(() => {
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: {} });

  it("accepts a correctly signed body", () => {
    expect(razorpayProvider.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a body signed with the wrong secret — the core forgery case", () => {
    expect(razorpayProvider.verifyWebhookSignature(body, sign(body, "attacker-secret"))).toBe(false);
  });

  it("rejects a tampered body even with a previously-valid signature", () => {
    const validSignature = sign(body);
    const tamperedBody = JSON.stringify({ event: "payment.captured", payload: { evil: true } });
    expect(razorpayProvider.verifyWebhookSignature(tamperedBody, validSignature)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(razorpayProvider.verifyWebhookSignature(body, null)).toBe(false);
  });

  it("rejects a garbage signature of a different length (must not throw)", () => {
    expect(razorpayProvider.verifyWebhookSignature(body, "short")).toBe(false);
  });

  it("rejects everything when the webhook secret isn't configured — fails closed, not open", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(razorpayProvider.verifyWebhookSignature(body, sign(body))).toBe(false);
  });
});

describe("parseWebhookEvent", () => {
  it("extracts event type, order id, and payment id", () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_123", order_id: "order_456" } } },
    });
    const event = razorpayProvider.parseWebhookEvent(body);
    expect(event.type).toBe("payment.captured");
    expect(event.paymentId).toBe("pay_123");
    expect(event.orderId).toBe("order_456");
  });

  it("returns nulls rather than throwing when the payload shape is unexpected", () => {
    const event = razorpayProvider.parseWebhookEvent(JSON.stringify({ event: "some.other.event" }));
    expect(event.type).toBe("some.other.event");
    expect(event.paymentId).toBeNull();
    expect(event.orderId).toBeNull();
  });
});
