import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireApiRole";
import { ADMIN_ROLES } from "@/types/roles";
import { templeInputSchema } from "@/features/temples/schemas";
import { createTemple } from "@/features/temples/api";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = templeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const id = await createTemple(parsed.data);
  await writeAuditLog({
    actorUid: auth.user.uid,
    action: "TEMPLE_CREATED",
    targetType: "temple",
    targetId: id,
    metadata: { name: parsed.data.name.en },
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
