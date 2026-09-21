import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { getBooking, updateBookingPayment } from "@/features/bookings/api";
import { razorpayProvider } from "@/lib/payments/razorpay";

/**
 * Creates a payment order for a booking the caller owns. Only the
 * booking's own customer can pay for it, and only a PENDING/CONFIRMED
 * booking that isn't already paid — this prevents both paying for
 * someone else's booking and double-charging.
 *
 * Returns only the order id, amount, and the PUBLIC key id — the
 * client needs exactly these three to open Razorpay's checkout widget,
 * and nothing secret ever crosses this boundary.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const booking = await getBooking(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.userId !== user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ error: "This booking is already paid" }, { status: 409 });
  }
  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    return NextResponse.json({ error: `Cannot pay for a ${booking.status.toLowerCase()} booking` }, { status: 409 });
  }
  if (booking.amount <= 0) {
    return NextResponse.json({ error: "This booking has no payable amount" }, { status: 400 });
  }

  try {
    const order = await razorpayProvider.createOrder({
      amountInRupees: booking.amount,
      currency: "INR",
      receipt: booking.id,
      notes: { bookingId: booking.id, providerType: booking.providerType },
    });

    await updateBookingPayment(booking.id, "PENDING", order.orderId, null);

    return NextResponse.json({
      orderId: order.orderId,
      amountInPaise: order.amountInPaise,
      currency: order.currency,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch {
    // Never surfaces the gateway's raw error (spec §39) — it can carry
    // account/key detail.
    return NextResponse.json({ error: "Couldn't start payment. Please try again." }, { status: 502 });
  }
}
