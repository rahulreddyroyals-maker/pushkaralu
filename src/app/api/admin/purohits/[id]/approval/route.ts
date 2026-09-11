import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { getPurohit, setPurohitApproval } from "@/features/purohits/api";
import { assignRole } from "@/lib/auth/assignRole";
import { writeAuditLog } from "@/lib/audit/log";

const bodySchema = z.object({
  approvalStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().min(3, "Provide a brief reason for the audit log").max(500),
});

/** Mirrors /api/admin/hotels/[id]/approval — see that file's comment for the role-grant-on-verify design. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const purohit = await getPurohit(id, { includeUnverified: true });
  if (!purohit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await setPurohitApproval(id, parsed.data.approvalStatus);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "PUROHIT_APPROVAL_STATUS_CHANGED",
    targetType: "purohit",
    targetId: id,
    metadata: { newStatus: parsed.data.approvalStatus, reason: parsed.data.reason },
  });

  if (parsed.data.approvalStatus === "VERIFIED") {
    const roleResult = await assignRole({
      actorUid: auth.user.uid,
      actorRole: auth.user.role,
      targetUid: purohit.userId,
      newRole: "PUROHIT",
      reason: `Purohit listing ${id} approved`,
    });
    if (!roleResult.ok) {
      return NextResponse.json({ ok: true, roleGrantWarning: roleResult.error });
    }
  }

  return NextResponse.json({ ok: true });
}
