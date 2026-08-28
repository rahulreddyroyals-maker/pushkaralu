import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { deleteAnnouncement } from "@/features/events/api";
import { writeAuditLog } from "@/lib/audit/log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId, announcementId } = await params;

  await deleteAnnouncement(eventId, announcementId);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "ANNOUNCEMENT_DELETED",
    targetType: "announcement",
    targetId: announcementId,
    metadata: { eventId },
  });

  return NextResponse.json({ ok: true });
}
