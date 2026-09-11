import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { canManageOwnListing } from "@/lib/auth/guards";
import { hotelInputSchema } from "@/features/hotels/schemas";
import { getHotel, updateHotel, deleteHotel } from "@/features/hotels/api";
import { writeAuditLog } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await getHotel(id, { includeUnverified: true });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageOwnListing(user.role, existing.ownerId, user.uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = hotelInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateHotel(id, parsed.data);
  await writeAuditLog({ actorUid: user.uid, action: "HOTEL_UPDATED", targetType: "hotel", targetId: id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await getHotel(id, { includeUnverified: true });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageOwnListing(user.role, existing.ownerId, user.uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteHotel(id);
  await writeAuditLog({ actorUid: user.uid, action: "HOTEL_DELETED", targetType: "hotel", targetId: id });

  return NextResponse.json({ ok: true });
}
