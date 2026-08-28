import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { setGhatPublished } from "@/features/ghats/api";
import { writeAuditLog } from "@/lib/audit/log";

const bodySchema = z.object({ published: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; ghatId: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId, ghatId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await setGhatPublished(eventId, ghatId, parsed.data.published);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: parsed.data.published ? "GHAT_PUBLISHED" : "GHAT_UNPUBLISHED",
    targetType: "ghat",
    targetId: ghatId,
    metadata: { eventId },
  });

  return NextResponse.json({ ok: true });
}
