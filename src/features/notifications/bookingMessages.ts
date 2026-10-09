import type { UserNotification } from "./service";

export type BookingEvent =
  | { kind: "CREATED" }
  | { kind: "STATUS"; status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "REFUNDED" | "PENDING"; actor: "customer" | "provider" | "admin" | "system" }
  | { kind: "PAYMENT_CAPTURED" }
  | { kind: "PAYMENT_FAILED"; orderId: string }
  | { kind: "REFUND_PROCESSED" };

export interface BookingRef {
  id: string;
  userId: string;
  providerOwnerId: string;
  serviceDate: string;
}

const link = "/bookings";
const when = (b: BookingRef) => (b.serviceDate ? ` for ${b.serviceDate}` : "");

/**
 * Turns a real booking change into the messages (if any) to send. Wording is
 * strictly factual — what changed and who did it — and every message has a
 * key unique to (booking, change), so a webhook retry can't notify twice.
 * Nobody is notified about an action they performed themselves.
 */
export function bookingNotifications(event: BookingEvent, b: BookingRef): UserNotification[] {
  const toCustomer = (key: string, title: string, message: string): UserNotification => ({ uid: b.userId, category: "BOOKING", title, message, link, key: `booking-${b.id}-${key}-customer` });
  const toProvider = (key: string, title: string, message: string): UserNotification => ({ uid: b.providerOwnerId, category: "BOOKING", title, message, link, key: `booking-${b.id}-${key}-provider` });

  switch (event.kind) {
    case "CREATED":
      return [
        toCustomer("created", "Booking request sent", `Your booking request${when(b)} was sent to the provider. You'll be notified when it is confirmed.`),
        toProvider("created", "New booking request", `You have a new booking request${when(b)}.`),
      ];
    case "STATUS": {
      const { status, actor } = event;
      const out: UserNotification[] = [];
      const word = status.toLowerCase();
      if (actor !== "customer") out.push(toCustomer(status, `Booking ${word}`, `Your booking${when(b)} is now ${word}.`));
      if (actor === "customer" && (status === "CANCELLED" || status === "CONFIRMED")) out.push(toProvider(status, `Booking ${word} by customer`, `A booking${when(b)} was ${word} by the customer.`));
      return out;
    }
    case "PAYMENT_CAPTURED":
      return [toCustomer("paid", "Payment received", `We received your payment for the booking${when(b)}.`), toProvider("paid", "Booking paid", `A booking${when(b)} has been paid.`)];
    case "PAYMENT_FAILED":
      return [toCustomer(`payfail-${event.orderId}`, "Payment didn't go through", `Your payment for the booking${when(b)} failed. You haven't been charged for it; you can try again from your bookings.`)];
    case "REFUND_PROCESSED":
      return [toCustomer("refunded", "Refund processed", `Your refund for the booking${when(b)} has been processed. It may take a few days to reach your account.`)];
  }
}
