import type { BookingStatus } from "./types";

export type BookingActor = "customer" | "provider" | "admin";

/**
 * Pure state machine for booking status transitions. Kept separate from
 * any route handler so the rules are visible in one place and directly
 * unit-testable. `REFUNDED` is deliberately ADMIN-only in every case —
 * it's the one transition that implies real money moving back, and spec
 * gives no indication providers should be able to trigger that
 * unilaterally.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, BookingActor[]>>> = {
  PENDING: {
    CONFIRMED: ["provider", "admin"],
    CANCELLED: ["customer", "provider", "admin"],
  },
  CONFIRMED: {
    CANCELLED: ["customer", "provider", "admin"],
    COMPLETED: ["provider", "admin"],
    REFUNDED: ["admin"],
  },
  COMPLETED: {
    REFUNDED: ["admin"],
  },
  CANCELLED: {},
  REFUNDED: {},
};

export function canTransitionBookingStatus(current: BookingStatus, next: BookingStatus, actor: BookingActor): boolean {
  return ALLOWED_TRANSITIONS[current]?.[next]?.includes(actor) ?? false;
}

/** The set of statuses `current` can legally move to, for building status-change UI dynamically rather than hardcoding button lists per screen. */
export function allowedNextStatuses(current: BookingStatus, actor: BookingActor): BookingStatus[] {
  const transitions = ALLOWED_TRANSITIONS[current] ?? {};
  return (Object.keys(transitions) as BookingStatus[]).filter((next) => transitions[next]?.includes(actor));
}
