import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { businessInputSchema } from "@/features/businesses/schemas";
import { createBusiness } from "@/features/businesses/api";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = businessInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const id = await createBusiness(user.uid, parsed.data);
  await writeAuditLog({
    actorUid: user.uid,
    action: "BUSINESS_APPLICATION_SUBMITTED",
    targetType: "business",
    targetId: id,
    metadata: { category: parsed.data.category },
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
