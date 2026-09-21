import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import { calculateCommission, calculateProviderPayout } from "@/features/settings/commission";
import { getMonetizationSettings } from "@/features/settings/api";
import type { Booking, BookingStatus, PaymentStatus } from "./types";
import type { CreateBookingInput } from "./schemas";

function mapBookingDoc(doc: QueryDocumentSnapshot<DocumentData>): Booking {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    userContactPhone: data.userContactPhone,
    providerId: data.providerId,
    providerType: data.providerType,
    providerOwnerId: data.providerOwnerId,
    serviceDate: data.serviceDate,
    serviceTime: data.serviceTime ?? null,
    quantity: data.quantity ?? 1,
    amount: data.amount ?? 0,
    commissionPercent: data.commissionPercent ?? 0,
    commissionAmount: data.commissionAmount ?? 0,
    providerPayout: data.providerPayout ?? 0,
    status: data.status ?? "PENDING",
    paymentStatus: data.paymentStatus ?? "UNPAID",
    paymentOrderId: data.paymentOrderId ?? null,
    paymentId: data.paymentId ?? null,
    notes: data.notes ?? "",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

/**
 * Snapshots the commission rate AT BOOKING TIME onto the booking itself
 * (commissionPercent, commissionAmount, providerPayout) rather than
 * computing it live whenever the booking is later viewed. This is
 * deliberate: if an admin changes the platform commission rate next
 * month, bookings made last month must keep showing what was actually
 * agreed at the time — recomputing historical bookings against a
 * changed rate would silently rewrite financial history.
 */
export async function createBooking(
  userId: string,
  userDisplayName: string,
  providerOwnerId: string,
  input: CreateBookingInput
): Promise<string> {
  const settings = await getMonetizationSettings();
  const commissionAmount = calculateCommission(input.amount, settings.bookingCommissionPercent);
  const providerPayout = calculateProviderPayout(input.amount, commissionAmount);

  const db = getAdminDb();
  const ref = db.collection("bookings").doc();
  await ref.set({
    userId,
    userDisplayName,
    userContactPhone: input.userContactPhone,
    providerId: input.providerId,
    providerType: input.providerType,
    providerOwnerId,
    serviceDate: input.serviceDate,
    serviceTime: input.serviceTime || null,
    quantity: input.quantity,
    amount: input.amount,
    commissionPercent: settings.bookingCommissionPercent,
    commissionAmount,
    providerPayout,
    status: "PENDING",
    paymentStatus: "UNPAID",
    paymentOrderId: null,
    paymentId: null,
    notes: input.notes || "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getBooking(id: string): Promise<Booking | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("bookings").doc(id).get();
  if (!snapshot.exists) return null;
  return mapBookingDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

/** A customer's own bookings. */
export async function listBookingsForCustomer(userId: string, pageSize = 50): Promise<Booking[]> {
  const db = getAdminDb();
  const snapshot = await db.collection("bookings").where("userId", "==", userId).orderBy("createdAt", "desc").limit(pageSize).get();
  return snapshot.docs.map(mapBookingDoc);
}

/** A provider's own bookings, across all their listings of one type — the provider dashboard's "Bookings" view. */
export async function listBookingsForProvider(providerId: string, pageSize = 50): Promise<Booking[]> {
  const db = getAdminDb();
  const snapshot = await db.collection("bookings").where("providerId", "==", providerId).orderBy("createdAt", "desc").limit(pageSize).get();
  return snapshot.docs.map(mapBookingDoc);
}

/** Admin booking dashboard — all bookings, optionally filtered by status. */
export async function listAllBookings(
  { pageSize = 50, cursor, status }: { pageSize?: number; cursor?: string | null; status?: BookingStatus } = {}
): Promise<PageResult<Booking>> {
  const db = getAdminDb();
  let query = db.collection("bookings").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (status) query = query.where("status", "==", status);
  return paginateQuery<Booking>(query, mapBookingDoc, { pageSize, cursor });
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const db = getAdminDb();
  await db.collection("bookings").doc(id).update({ status, updatedAt: FieldValue.serverTimestamp() });
}

export async function updateBookingPayment(
  id: string,
  paymentStatus: PaymentStatus,
  paymentOrderId?: string | null,
  paymentId?: string | null
): Promise<void> {
  const db = getAdminDb();
  const update: Record<string, unknown> = { paymentStatus, updatedAt: FieldValue.serverTimestamp() };
  if (paymentOrderId !== undefined) update.paymentOrderId = paymentOrderId;
  if (paymentId !== undefined) update.paymentId = paymentId;
  await db.collection("bookings").doc(id).update(update);
}

/**
 * Revenue/commission aggregation for admin reports — computed live from
 * the booking list rather than a maintained counter, same tradeoff as
 * getReviewAggregate in Sprint 4 (simpler, always-correct, revisit if
 * the dataset grows large enough that this becomes slow).
 */
export interface RevenueAggregate {
  totalBookings: number;
  totalAmount: number;
  totalCommission: number;
  totalProviderPayout: number;
  byStatus: Record<BookingStatus, number>;
}

export async function getRevenueAggregate(): Promise<RevenueAggregate> {
  const db = getAdminDb();
  const snapshot = await db.collection("bookings").get();
  const bookings = snapshot.docs.map(mapBookingDoc);

  const byStatus: Record<BookingStatus, number> = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0, REFUNDED: 0 };
  let totalAmount = 0;
  let totalCommission = 0;
  let totalProviderPayout = 0;

  for (const b of bookings) {
    byStatus[b.status] += 1;
    // Only count revenue for bookings that actually represent realized
    // (or at least confirmed-to-happen) business — PENDING bookings
    // haven't been accepted yet, CANCELLED/REFUNDED reversed it.
    if (b.status === "CONFIRMED" || b.status === "COMPLETED") {
      totalAmount += b.amount;
      totalCommission += b.commissionAmount;
      totalProviderPayout += b.providerPayout;
    }
  }

  return {
    totalBookings: bookings.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    totalProviderPayout: Math.round(totalProviderPayout * 100) / 100,
    byStatus,
  };
}

/** Per-provider commission/revenue breakdown — the admin "Commission report" and "Provider report" both build on this. */
export interface ProviderRevenueRow {
  providerId: string;
  providerType: string;
  bookingCount: number;
  totalAmount: number;
  totalCommission: number;
  totalProviderPayout: number;
}

export async function getProviderRevenueBreakdown(): Promise<ProviderRevenueRow[]> {
  const db = getAdminDb();
  const snapshot = await db.collection("bookings").where("status", "in", ["CONFIRMED", "COMPLETED"]).get();
  const rows = new Map<string, ProviderRevenueRow>();

  for (const doc of snapshot.docs) {
    const b = mapBookingDoc(doc as QueryDocumentSnapshot<DocumentData>);
    const key = `${b.providerType}:${b.providerId}`;
    const existing = rows.get(key) ?? {
      providerId: b.providerId,
      providerType: b.providerType,
      bookingCount: 0,
      totalAmount: 0,
      totalCommission: 0,
      totalProviderPayout: 0,
    };
    existing.bookingCount += 1;
    existing.totalAmount += b.amount;
    existing.totalCommission += b.commissionAmount;
    existing.totalProviderPayout += b.providerPayout;
    rows.set(key, existing);
  }

  return Array.from(rows.values()).sort((a, b) => b.totalCommission - a.totalCommission);
}
