import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { bookingStatusUpdateSchema } from "@/features/bookings/schemas";
import { getBooking, updateBookingStatus } from "@/features/bookings/api";
import { canTransitionBookingStatus, type BookingActor } from "@/features/bookings/statusMachine";
import { isAdminRole } from "@/types/roles";
import { writeAuditLog } from "@/lib/audit/log";

/**
 * Two independent checks, both required:
 *   1. WHO is the caller relative to this booking (customer / provider /
 *      admin)? Derived from the booking's own userId and
 *      providerOwnerId — never from anything the client sends.
 *   2. Is that actor allowed to make THIS specific transition? Delegated
 *      to the pure state machine (features/bookings/statusMachine.ts),
 *      which is unit tested separately.
 * A caller unrelated to the booking is neither — they get 403 before the
 * state machine is even consulted.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bookingStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const booking = await getBooking(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let actor: BookingActor;
  if (user.role && isAdminRole(user.role)) {
    actor = "admin";
  } else if (booking.userId === user.uid) {
    actor = "customer";
  } else if (booking.providerOwnerId === user.uid) {
    actor = "provider";
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canTransitionBookingStatus(booking.status, parsed.data.status, actor)) {
    return NextResponse.json(
      { error: `Cannot change a ${booking.status} booking to ${parsed.data.status} as ${actor}` },
      { status: 409 }
    );
  }

  await updateBookingStatus(id, parsed.data.status);
  await writeAuditLog({
    actorUid: user.uid,
    action: "BOOKING_STATUS_CHANGED",
    targetType: "booking",
    targetId: id,
    metadata: { from: booking.status, to: parsed.data.status, actor },
  });

  return NextResponse.json({ ok: true });
}
