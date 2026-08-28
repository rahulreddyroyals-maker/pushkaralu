import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { ghatInputSchema } from "@/features/ghats/schemas";
import { updateGhat, deleteGhat } from "@/features/ghats/api";
import { writeAuditLog } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string; ghatId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId, ghatId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = ghatInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateGhat(eventId, ghatId, parsed.data);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "GHAT_UPDATED",
    targetType: "ghat",
    targetId: ghatId,
    metadata: { eventId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId, ghatId } = await params;

  await deleteGhat(eventId, ghatId);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "GHAT_DELETED",
    targetType: "ghat",
    targetId: ghatId,
    metadata: { eventId },
  });

  return NextResponse.json({ ok: true });
}
