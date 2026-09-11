import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { leadStatusUpdateSchema } from "@/features/leads/schemas";
import { setLeadStatus } from "@/features/leads/api";
import { getHotel } from "@/features/hotels/api";
import { getPurohit } from "@/features/purohits/api";
import { getBusiness } from "@/features/businesses/api";
import { isAdminRole } from "@/types/roles";
import { getAdminDb } from "@/lib/firebase/admin";
import type { LeadProviderType } from "@/features/leads/types";

async function resolveListingOwnerId(providerType: LeadProviderType, providerId: string): Promise<string | null> {
  if (providerType === "hotel") return (await getHotel(providerId, { includeUnverified: true }))?.ownerId ?? null;
  if (providerType === "purohit") return (await getPurohit(providerId, { includeUnverified: true }))?.userId ?? null;
  return (await getBusiness(providerId, { includeUnverified: true }))?.ownerId ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = leadStatusUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const db = getAdminDb();
  const leadSnapshot = await db.collection("leads").doc(id).get();
  if (!leadSnapshot.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lead = leadSnapshot.data()!;

  if (!user.role || !isAdminRole(user.role)) {
    const ownerId = await resolveListingOwnerId(lead.providerType, lead.providerId);
    if (ownerId !== user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await setLeadStatus(id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
