import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { eventInputSchema } from "@/features/events/schemas";
import { updateEvent, deleteEvent } from "@/features/events/api";
import { writeAuditLog } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateEvent(id, parsed.data);
  await writeAuditLog({ actorUid: auth.user.uid, action: "EVENT_UPDATED", targetType: "event", targetId: id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  await deleteEvent(id);
  await writeAuditLog({ actorUid: auth.user.uid, action: "EVENT_DELETED", targetType: "event", targetId: id });

  return NextResponse.json({ ok: true });
}
