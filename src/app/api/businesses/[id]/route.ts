import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { canManageOwnListing } from "@/lib/auth/guards";
import { businessInputSchema } from "@/features/businesses/schemas";
import { getBusiness, updateBusiness, deleteBusiness } from "@/features/businesses/api";
import { writeAuditLog } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await getBusiness(id, { includeUnverified: true });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageOwnListing(user.role, existing.ownerId, user.uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = businessInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateBusiness(id, parsed.data);
  await writeAuditLog({ actorUid: user.uid, action: "BUSINESS_UPDATED", targetType: "business", targetId: id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await getBusiness(id, { includeUnverified: true });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageOwnListing(user.role, existing.ownerId, user.uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteBusiness(id);
  await writeAuditLog({ actorUid: user.uid, action: "BUSINESS_DELETED", targetType: "business", targetId: id });

  return NextResponse.json({ ok: true });
}
