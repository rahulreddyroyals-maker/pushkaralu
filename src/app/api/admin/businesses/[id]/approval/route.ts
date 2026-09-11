import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { getBusiness, setBusinessApproval } from "@/features/businesses/api";
import { BUSINESS_CATEGORY_ROLE } from "@/features/businesses/types";
import { assignRole } from "@/lib/auth/assignRole";
import { writeAuditLog } from "@/lib/audit/log";

const bodySchema = z.object({
  approvalStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().min(3, "Provide a brief reason for the audit log").max(500),
});

/**
 * Mirrors the hotel/purohit approval routes, except the granted role
 * depends on the business's `category` (taxi/travel_operator ->
 * TRAVEL_OPERATOR, boat -> BOAT_OPERATOR, everything else ->
 * BUSINESS_OWNER) — see BUSINESS_CATEGORY_ROLE in features/businesses/types.ts.
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

  const business = await getBusiness(id, { includeUnverified: true });
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await setBusinessApproval(id, parsed.data.approvalStatus);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "BUSINESS_APPROVAL_STATUS_CHANGED",
    targetType: "business",
    targetId: id,
    metadata: { newStatus: parsed.data.approvalStatus, reason: parsed.data.reason, category: business.category },
  });

  if (parsed.data.approvalStatus === "VERIFIED") {
    const roleResult = await assignRole({
      actorUid: auth.user.uid,
      actorRole: auth.user.role,
      targetUid: business.ownerId,
      newRole: BUSINESS_CATEGORY_ROLE[business.category],
      reason: `Business listing ${id} (${business.category}) approved`,
    });
    if (!roleResult.ok) {
      return NextResponse.json({ ok: true, roleGrantWarning: roleResult.error });
    }
  }

  return NextResponse.json({ ok: true });
}
