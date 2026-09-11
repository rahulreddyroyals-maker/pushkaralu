import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { setRitualPublished } from "@/features/rituals/api";
import { writeAuditLog } from "@/lib/audit/log";

const bodySchema = z.object({ published: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await setRitualPublished(id, parsed.data.published);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: parsed.data.published ? "RITUAL_PUBLISHED" : "RITUAL_UNPUBLISHED",
    targetType: "ritual",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
