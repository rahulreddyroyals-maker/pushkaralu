import crypto from "node:crypto";
import type { CreateOrderParams, PaymentOrder, PaymentProvider, WebhookEvent } from "./types";

/**
 * Razorpay implementation of PaymentProvider. SERVER ONLY — reads
 * RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET, neither of which is
 * NEXT_PUBLIC_ prefixed, so neither can reach the browser bundle. The
 * public key id (NEXT_PUBLIC_RAZORPAY_KEY_ID) is the only payment value
 * the client ever sees, which is what Razorpay's own checkout widget
 * expects.
 *
 * Uses Razorpay's REST API directly over fetch rather than adding their
 * Node SDK as a dependency — the two calls we need (create order, verify
 * webhook signature) are simple enough that the SDK isn't worth the
 * extra dependency and its own bundling quirks on Vercel (a lesson from
 * the firebase-admin/gRPC bundling issue earlier in this project).
 */
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function getCredentials() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay credentials: NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  return { keyId, keySecret };
}

export const razorpayProvider: PaymentProvider = {
  async createOrder({ amountInRupees, currency, receipt, notes }: CreateOrderParams): Promise<PaymentOrder> {
    const { keyId, keySecret } = getCredentials();
    // Razorpay works in the smallest currency unit (paise for INR).
    const amountInPaise = Math.round(amountInRupees * 100);

    const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt, notes: notes ?? {} }),
    });

    if (!res.ok) {
      // Deliberately does NOT surface Razorpay's raw error body to the
      // caller — that can contain account/key detail. The route handler
      // turns this into a generic user-facing message (spec §39).
      throw new Error(`Razorpay order creation failed with status ${res.status}`);
    }

    const data = (await res.json()) as { id: string; amount: number; currency: string };
    return { orderId: data.id, amountInPaise: data.amount, currency: data.currency };
  },

  /**
   * Razorpay signs webhook bodies with HMAC-SHA256 using the webhook
   * secret (set in the Razorpay dashboard, NOT the same as the API key
   * secret). Verified with a timing-safe comparison — a plain ===
   * comparison on an HMAC is a textbook timing-attack vector.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !signatureHeader) return false;

    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    const entity = parsed.payload?.payment?.entity;
    return {
      type: parsed.event ?? "unknown",
      orderId: entity?.order_id ?? null,
      paymentId: entity?.id ?? null,
      raw: parsed,
    };
  },
};
