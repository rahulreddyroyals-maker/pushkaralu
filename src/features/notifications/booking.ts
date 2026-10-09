import "server-only";
import { notificationDeps } from "./deps";
import { notifyUser } from "./service";
import { bookingNotifications, type BookingEvent, type BookingRef } from "./bookingMessages";

/** Fire-and-forget: a notification problem must never fail or roll back the booking action that triggered it. */
export async function notifyBooking(event: BookingEvent, booking: BookingRef): Promise<void> {
  try {
    for (const n of bookingNotifications(event, booking)) await notifyUser(notificationDeps, n);
  } catch (error) {
    console.error("[notifications] booking notification failed", error);
  }
}
