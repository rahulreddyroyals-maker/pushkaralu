import type { LeadProviderType } from "@/features/leads/types";

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REFUNDED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PENDING", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * bookings/{bookingId} — top-level, generic across provider types (spec
 * Module 18 / this sprint's "reusable booking architecture" ask). Not
 * tied to an event — a hotel/purohit/business booking can happen any
 * time, not just during a Pushkaralu.
 */
export interface Booking {
  id: string;
  userId: string;
  userDisplayName: string;
  userContactPhone: string;
  providerId: string;
  providerType: LeadProviderType;
  providerOwnerId: string; // denormalized at creation time — lets the provider query "my bookings" without a join
  serviceDate: string; // ISO date (no time component required — some bookings are date-only)
  serviceTime: string | null; // free-text time slot, e.g. "10:00 AM" — optional, not every booking needs one
  quantity: number;
  amount: number; // the total price agreed for this booking
  commissionPercent: number; // SNAPSHOT of the rate at booking time — see features/settings/commission.ts comment
  commissionAmount: number;
  providerPayout: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentOrderId: string | null; // Razorpay order id, once created
  paymentId: string | null; // Razorpay payment id, once captured
  notes: string;
  createdAt: string;
  updatedAt: string;
}
