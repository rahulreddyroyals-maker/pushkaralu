import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { crowdStatusUpdateSchema } from "@/features/ghats/schemas";
import { updateCrowdStatus } from "@/features/ghats/api";
import { writeAuditLog } from "@/lib/audit/log";

/** MODERATOR and above — deliberately a lower bar than full ghat edits (ADMIN), matching the day-to-day operational nature of crowd updates. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; ghatId: string }> }) {
  const auth = await requireRole(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;
  const { id: eventId, ghatId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = crowdStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateCrowdStatus(eventId, ghatId, parsed.data.crowdStatus, auth.user.uid);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "GHAT_CROWD_STATUS_UPDATED",
    targetType: "ghat",
    targetId: ghatId,
    metadata: { eventId, crowdStatus: parsed.data.crowdStatus },
  });

  return NextResponse.json({ ok: true });
}
