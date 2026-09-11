import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { deleteReview } from "@/features/reviews/api";
import { writeAuditLog } from "@/lib/audit/log";

/** MODERATOR and above — matches the moderation-queue pattern used elsewhere. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);
  if (auth.error) return auth.error;
  const { id } = await params;

  await deleteReview(id);
  await writeAuditLog({ actorUid: auth.user.uid, action: "REVIEW_DELETED", targetType: "review", targetId: id });

  return NextResponse.json({ ok: true });
}
