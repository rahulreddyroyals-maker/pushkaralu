import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { getHotel, setHotelApproval } from "@/features/hotels/api";
import { assignRole } from "@/lib/auth/assignRole";
import { writeAuditLog } from "@/lib/audit/log";

const bodySchema = z.object({
  approvalStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().min(3, "Provide a brief reason for the audit log").max(500),
});

/**
 * Sets a hotel listing's approval status. When moving TO 'VERIFIED', also
 * grants the owner the HOTEL_OWNER role via the same shared assignRole()
 * path used by /api/admin/users/[uid]/role — this is what turns a plain
 * USER who submitted an application into an actual provider (spec: "Admin
 * must approve providers"). Demoting later (SUSPENDED) intentionally does
 * NOT revoke the role automatically — a suspended listing might be one of
 * several a provider owns; role revocation is a separate, deliberate admin
 * action via the user-role endpoint if truly warranted.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const hotel = await getHotel(id, { includeUnverified: true });
  if (!hotel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await setHotelApproval(id, parsed.data.approvalStatus);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "HOTEL_APPROVAL_STATUS_CHANGED",
    targetType: "hotel",
    targetId: id,
    metadata: { newStatus: parsed.data.approvalStatus, reason: parsed.data.reason },
  });

  if (parsed.data.approvalStatus === "VERIFIED") {
    const roleResult = await assignRole({
      actorUid: auth.user.uid,
      actorRole: auth.user.role,
      targetUid: hotel.ownerId,
      newRole: "HOTEL_OWNER",
      reason: `Hotel listing ${id} approved`,
    });
    if (!roleResult.ok) {
      return NextResponse.json({ ok: true, roleGrantWarning: roleResult.error });
    }
  }

  return NextResponse.json({ ok: true });
}
