import "server-only";
import { NextResponse } from "next/server";
import { checkRate } from "@/lib/rateLimit";
import { createFirestoreRateStore } from "@/lib/rateLimitFirestore";

const store = createFirestoreRateStore("apiRateLimits");

/**
 * Per-user abuse guard for write endpoints. Returns a 429 response when the caller is over the limit, else null.
 * Fails OPEN if the counter store itself errors (an outage there must not take bookings down) but logs it.
 */
export async function rateLimitUser(uid: string, bucket: string, limit: number, windowMs = 3_600_000): Promise<NextResponse | null> {
  try {
    const d = await checkRate(store, `${bucket}:${uid}`, limit, windowMs, Date.now());
    if (d.allowed) return null;
    return NextResponse.json({ error: "Too many requests. Please try again later.", retryAfterSeconds: d.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(d.retryAfterSeconds) } });
  } catch (error) {
    console.error("[rate-limit] store error", error);
    return null;
  }
}
