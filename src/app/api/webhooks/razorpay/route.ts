import { NextRequest, NextResponse } from "next/server";
import { razorpayProvider } from "@/lib/payments/razorpay";
import { getAdminDb } from "@/lib/firebase/admin";
import { updateBookingPayment, updateBookingStatus } from "@/features/bookings/api";
import { writeAuditLog } from "@/lib/audit/log";
import { timestampToIso } from "@/lib/pagination";

/**
 * Razorpay webhook receiver. This endpoint is PUBLIC (Razorpay's servers
 * call it, not a signed-in user), so the signature check IS the
 * authentication — everything else in this file assumes it has already
 * passed.
 *
 * Reads the raw body text BEFORE parsing, because the HMAC is computed
 * over the exact bytes Razorpay sent; re-serializing a parsed object
 * would produce a different string and fail verification for reasons
 * that are miserable to debug.
 *
 * Idempotent by design: webhooks get retried and can arrive out of
 * order, so a repeat "payment.captured" for an already-PAID booking is
 * a no-op success, not an error or a double-update.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!razorpayProvider.verifyWebhookSignature(rawBody, signature)) {
    // 401 with no detail — an attacker probing this endpoint learns
    // nothing about why their forgery failed.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = razorpayProvider.parseWebhookEvent(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (!event.orderId) {
    // Some Razorpay events (subscriptions, settlements) carry no order
    // id. Acknowledge so Razorpay stops retrying, but do nothing.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const db = getAdminDb();
  const snapshot = await db.collection("bookings").where("paymentOrderId", "==", event.orderId).limit(1).get();
  if (snapshot.empty) {
    // Unknown order — acknowledge rather than 404, so Razorpay doesn't
    // retry forever on an order that was never ours.
    return NextResponse.json({ ok: true, unmatched: true });
  }

  const doc = snapshot.docs[0];
  const booking = doc.data();
  const bookingId = doc.id;

  if (event.type === "payment.captured") {
    if (booking.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }
    await updateBookingPayment(bookingId, "PAID", event.orderId, event.paymentId);
    // A paid booking auto-confirms — the provider no longer needs to
    // accept it separately once money has actually changed hands.
    if (booking.status === "PENDING") {
      await updateBookingStatus(bookingId, "CONFIRMED");
    }
    await writeAuditLog({
      actorUid: "system:razorpay-webhook",
      action: "BOOKING_PAYMENT_CAPTURED",
      targetType: "booking",
      targetId: bookingId,
      metadata: { orderId: event.orderId, paymentId: event.paymentId },
    });
    return NextResponse.json({ ok: true });
  }

  if (event.type === "payment.failed") {
    await updateBookingPayment(bookingId, "UNPAID", event.orderId, null);
    await writeAuditLog({
      actorUid: "system:razorpay-webhook",
      action: "BOOKING_PAYMENT_FAILED",
      targetType: "booking",
      targetId: bookingId,
      metadata: { orderId: event.orderId },
    });
    return NextResponse.json({ ok: true });
  }

  if (event.type === "refund.processed") {
    await updateBookingPayment(bookingId, "REFUNDED", event.orderId, event.paymentId);
    await writeAuditLog({
      actorUid: "system:razorpay-webhook",
      action: "BOOKING_REFUND_PROCESSED",
      targetType: "booking",
      targetId: bookingId,
      metadata: { orderId: event.orderId, lastUpdated: timestampToIso(booking.updatedAt) },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
