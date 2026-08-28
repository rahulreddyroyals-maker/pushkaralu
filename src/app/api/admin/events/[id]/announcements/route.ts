import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES, STAFF_ROLES } from "@/types/roles";
import { announcementInputSchema } from "@/features/events/schemas";
import { createAnnouncement, listAnnouncements } from "@/features/events/api";
import { writeAuditLog } from "@/lib/audit/log";

/** GET — staff-only listing, includes unpublished (there is none currently, since createAnnouncement always publishes — see api.ts — but this stays consistent with the pattern used everywhere else). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(STAFF_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId } = await params;

  const result = await listAnnouncements(eventId, { pageSize: 50, includeUnpublished: true });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id: eventId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = announcementInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const announcementId = await createAnnouncement(eventId, parsed.data);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "ANNOUNCEMENT_CREATED",
    targetType: "announcement",
    targetId: announcementId,
    metadata: { eventId },
  });

  return NextResponse.json({ ok: true, id: announcementId }, { status: 201 });
}
