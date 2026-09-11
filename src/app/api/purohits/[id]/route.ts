import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { canManageOwnListing } from "@/lib/auth/guards";
import { purohitInputSchema } from "@/features/purohits/schemas";
import { getPurohit, updatePurohit, deletePurohit } from "@/features/purohits/api";
import { writeAuditLog } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await getPurohit(id, { includeUnverified: true });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageOwnListing(user.role, existing.userId, user.uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = purohitInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updatePurohit(id, parsed.data);
  await writeAuditLog({ actorUid: user.uid, action: "PUROHIT_UPDATED", targetType: "purohit", targetId: id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const existing = await getPurohit(id, { includeUnverified: true });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageOwnListing(user.role, existing.userId, user.uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deletePurohit(id);
  await writeAuditLog({ actorUid: user.uid, action: "PUROHIT_DELETED", targetType: "purohit", targetId: id });

  return NextResponse.json({ ok: true });
}
