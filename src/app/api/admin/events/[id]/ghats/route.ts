import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { ghatInputSchema } from "@/features/ghats/schemas";
import { createGhat } from "@/features/ghats/api";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = ghatInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const ghatId = await createGhat(eventId, parsed.data);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "GHAT_CREATED",
    targetType: "ghat",
    targetId: ghatId,
    metadata: { eventId, name: parsed.data.name.en },
  });

  return NextResponse.json({ ok: true, id: ghatId }, { status: 201 });
}
