import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { ritualInputSchema } from "@/features/rituals/schemas";
import { createRitual } from "@/features/rituals/api";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = ritualInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const id = await createRitual(parsed.data);
  await writeAuditLog({ actorUid: auth.user.uid, action: "RITUAL_CREATED", targetType: "ritual", targetId: id });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
