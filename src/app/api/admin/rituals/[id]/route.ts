import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { ritualInputSchema } from "@/features/rituals/schemas";
import { updateRitual, deleteRitual } from "@/features/rituals/api";
import { writeAuditLog } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = ritualInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateRitual(id, parsed.data);
  await writeAuditLog({ actorUid: auth.user.uid, action: "RITUAL_UPDATED", targetType: "ritual", targetId: id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  await deleteRitual(id);
  await writeAuditLog({ actorUid: auth.user.uid, action: "RITUAL_DELETED", targetType: "ritual", targetId: id });

  return NextResponse.json({ ok: true });
}
