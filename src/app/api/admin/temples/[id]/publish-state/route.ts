import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { setTemplePublished } from "@/features/temples/api";
import { writeAuditLog } from "@/lib/audit/log";

const bodySchema = z.object({ published: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await setTemplePublished(id, parsed.data.published);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: parsed.data.published ? "TEMPLE_PUBLISHED" : "TEMPLE_UNPUBLISHED",
    targetType: "temple",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
