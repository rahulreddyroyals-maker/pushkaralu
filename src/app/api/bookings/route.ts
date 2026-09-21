import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { createBookingInputSchema } from "@/features/bookings/schemas";
import { createBooking, listBookingsForCustomer, listBookingsForProvider } from "@/features/bookings/api";
import { resolveListingOwnerId } from "@/features/leads/resolveOwner";
import { getAdminDb } from "@/lib/firebase/admin";
import { isAdminRole } from "@/types/roles";
import type { LeadProviderType } from "@/features/leads/types";

/**
 * Creates a booking. Deliberately does NOT accept commission, payout,
 * status, or providerOwnerId from the client — all four are derived
 * server-side (commission from settings/monetization, owner from the
 * listing itself, status always starts PENDING). A client posting its
 * own commissionAmount would otherwise be able to zero out the
 * platform's cut.
 */
export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createBookingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const providerOwnerId = await resolveListingOwnerId(parsed.data.providerType, parsed.data.providerId);
  if (!providerOwnerId) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  if (providerOwnerId === user.uid) {
    return NextResponse.json({ error: "You can't book your own listing" }, { status: 400 });
  }

  const db = getAdminDb();
  const profile = await db.collection("users").doc(user.uid).get();
  const displayName = (profile.data()?.displayName as string | undefined) ?? "A pilgrim";

  const id = await createBooking(user.uid, displayName, providerOwnerId, parsed.data);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

/**
 * GET — the caller's own bookings by default ("as=customer"), or a
 * listing's bookings when the caller owns that listing
 * ("as=provider&providerId=..."). There is no "all bookings" mode here;
 * admin uses its own dashboard which reads via listAllBookings().
 */
export async function GET(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const as = req.nextUrl.searchParams.get("as") ?? "customer";

  if (as === "provider") {
    const providerId = req.nextUrl.searchParams.get("providerId");
    const providerType = req.nextUrl.searchParams.get("providerType") as LeadProviderType | null;
    if (!providerId || !providerType) {
      return NextResponse.json({ error: "providerId and providerType are required" }, { status: 400 });
    }
    if (!user.role || !isAdminRole(user.role)) {
      const ownerId = await resolveListingOwnerId(providerType, providerId);
      if (ownerId !== user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ items: await listBookingsForProvider(providerId) });
  }

  return NextResponse.json({ items: await listBookingsForCustomer(user.uid) });
}
