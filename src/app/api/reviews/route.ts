import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { reviewInputSchema } from "@/features/reviews/schemas";
import { createReview, listReviews } from "@/features/reviews/api";
import { getAdminDb } from "@/lib/firebase/admin";
import type { LeadProviderType } from "@/features/leads/types";

/**
 * NOTE: not yet gated to "only reviewable after a completed booking" —
 * see the comment in features/reviews/types.ts for why (Booking module
 * doesn't exist yet). Any signed-in user can review any provider.
 */
export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getAdminDb();
  const profileSnapshot = await db.collection("users").doc(user.uid).get();
  const displayName = (profileSnapshot.data()?.displayName as string | undefined) ?? "A pilgrim";

  const id = await createReview(user.uid, displayName, parsed.data);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

/** GET ?providerId=&providerType= — public. */
export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("providerId");
  const providerType = req.nextUrl.searchParams.get("providerType") as LeadProviderType | null;
  if (!providerId || !providerType) {
    return NextResponse.json({ error: "providerId and providerType are required" }, { status: 400 });
  }
  const reviews = await listReviews(providerId, providerType);
  return NextResponse.json({ items: reviews });
}
