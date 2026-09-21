import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { leadStatusUpdateSchema } from "@/features/leads/schemas";
import { setLeadStatus } from "@/features/leads/api";
import { resolveListingOwnerId } from "@/features/leads/resolveOwner";
import { isAdminRole } from "@/types/roles";
import { getAdminDb } from "@/lib/firebase/admin";

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
