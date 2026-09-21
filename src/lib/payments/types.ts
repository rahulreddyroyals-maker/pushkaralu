/**
 * Payment provider abstraction (spec: "Prepare Razorpay/payment
 * abstraction"). The rest of the app (booking creation, the checkout UI)
 * depends on THIS interface, not on Razorpay's SDK/API shape directly —
 * swapping providers later means writing one new file that implements
 * this interface, not touching every call site.
 */
export interface CreateOrderParams {
  amountInRupees: number;
  currency: "INR";
  receipt: string; // typically the booking id
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amountInPaise: number;
  currency: string;
}

export interface WebhookEvent {
  type: string; // e.g. "payment.captured", "payment.failed"
  orderId: string | null;
  paymentId: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  /** Verifies a webhook's signature. MUST be called before trusting any webhook payload — see the route handler for why this matters. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
